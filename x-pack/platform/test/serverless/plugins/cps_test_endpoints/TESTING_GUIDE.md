# Testing Guide: CPS Internal User Behavior

This guide explains how to test the CPS (Cross-Project Search) test endpoints plugin locally in serverless mode and in serverless QA.

## Prerequisites

### For Local Testing
- Docker installed and running
- Authenticated with Elastic's Docker registry (https://docker-auth.elastic.co/github_auth)
- Increased OS virtual memory limits (see [ES Docker docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html#docker-prod-prerequisites))
- Kibana repository cloned and bootstrapped (`yarn kbn bootstrap`)

### For QA Testing
- Access to serverless QA environment
- Two linked CPS projects created
- Kibana built with the test plugin included

## Local Testing Steps

### Step 1: Bootstrap (if not done already)

```bash
cd /path/to/kibana
yarn kbn bootstrap
```

### Step 2: Start Elasticsearch in Serverless Mode with CPS

```bash
# Terminal 1: Start ES in serverless mode
# Choose the project type that matches your work (e.g., observability)
yarn es serverless --projectType=oblt
```

**Note**: For proper CPS testing locally, you'll need to simulate a CPS environment. The local ES serverless mode may not fully replicate the linked projects scenario. Consider testing primarily in QA.

### Step 3: Start Kibana in Serverless Mode

```bash
# Terminal 2: Start Kibana in serverless mode
yarn serverless-oblt
```

Kibana will start on http://localhost:5601

### Step 4: Verify Plugin is Loaded

Open the browser console and check the health endpoint:

```javascript
fetch('/internal/cps_test/health')
  .then(r => r.json())
  .then(console.log)
```

Expected response:
```json
{
  "status": "ok",
  "message": "CPS Test Endpoints plugin is running",
  "timestamp": "2026-02-25T..."
}
```

### Step 5: Run the CPS Tests

In the browser console (with Kibana UI open at http://localhost:5601):

```javascript
// Run all test scenarios
fetch('/internal/cps_test/run_all', {
  method: 'POST',
  headers: {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    systemIndex: '.kibana',
    dataIndex: 'logs-*',
    projectRoutingValues: ['_alias:_origin', '_alias:_linked_1', '_alias:_all']
  })
}).then(r => r.json()).then(console.log)
```

Or using curl:

```bash
curl -X POST http://localhost:5601/internal/cps_test/run_all \
  -u elastic_serverless:changeme \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "systemIndex": ".kibana",
    "dataIndex": "logs-*",
    "projectRoutingValues": ["_alias:_origin", "_alias:_linked_1", "_alias:_all"]
  }'
```

### Step 6: Analyze Results

The response will show:
- Total number of test scenarios
- Number passed/failed
- Detailed results for each scenario including:
  - Whether ES accepted the request
  - Status codes
  - Hit counts
  - Any error messages

**Expected behavior**: All scenarios should pass (success: true, statusCode: 200) because ES should accept project_routing from the internal user and route to origin.

## QA/MKI Testing Steps

### Step 1: Prepare Your Code

1. **Commit your changes** with the plugin:
   ```bash
   git add x-pack/platform/test/serverless/plugins/cps_test_endpoints
   git commit -m "Add CPS test endpoints plugin for internal user validation"
   ```

2. **Create a PR** or push to a branch that will be deployed

### Step 2: Set Up QA Environment

You need **two serverless projects** with CPS linking configured:

1. **Project A** (Origin): The main project where Kibana is running
2. **Project B** (Linked): A linked project for CPS

Contact your QA team or use the serverless project creation tools to:
- Create two projects (e.g., both observability projects)
- Configure CPS linking between them
- Note the project IDs/aliases for use in testing

### Step 3: Deploy to QA

Deploy your Kibana build (with the plugin) to Project A:

1. If using a Docker image:
   - Build: Create a Docker image with your changes
   - Deploy: Update Project A to use your custom image

2. If using a PR deployment:
   - The QA automation may automatically deploy your PR
   - Or manually trigger a deployment to your test project

### Step 4: Verify Plugin is Running in QA

```bash
# Replace with your actual QA URLs and credentials
curl https://your-project.qa.elastic.co/internal/cps_test/health \
  -u username:password
```

Expected response:
```json
{
  "status": "ok",
  "message": "CPS Test Endpoints plugin is running",
  "timestamp": "..."
}
```

### Step 5: Run CPS Tests in QA

**Method 1: Using curl (Recommended)**

```bash
# Replace values:
# - URL: Your Project A URL
# - username:password: Your credentials
# - systemIndex: A system index that exists (e.g., .kibana)
# - dataIndex: A data index pattern (e.g., logs-*, metrics-*)
# - projectRoutingValues: Use the actual linked project alias (e.g., _alias:project-b-id)

curl -X POST https://your-project.qa.elastic.co/internal/cps_test/run_all \
  -u username:password \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "systemIndex": ".kibana",
    "dataIndex": "logs-*",
    "projectRoutingValues": ["_alias:project-b-id", "_alias:_all"]
  }' | jq '.'
```

**Method 2: Using Browser Console**

1. Log into Kibana UI in Project A
2. Open browser console (F12)
3. Run:

```javascript
fetch('/internal/cps_test/run_all', {
  method: 'POST',
  headers: {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    systemIndex: '.kibana',
    dataIndex: 'logs-*',
    projectRoutingValues: ['_alias:project-b-id', '_alias:_all']
  })
}).then(r => r.json()).then(data => {
  console.log('CPS Test Results:');
  console.log('Summary:', data.summary);
  console.table(data.scenarios);
  return data;
})
```

### Step 6: Interpret QA Results

Review the output:

**Success Scenario** (Expected):
```json
{
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  },
  "scenarios": [
    {
      "scenario": "System index search (.kibana) with project_routing=_alias:project-b",
      "success": true,
      "statusCode": 200,
      "details": {
        "message": "Request succeeded - ES accepted project_routing for internal user",
        "hitsCount": 150
      }
    }
    // ...
  ]
}
```

**Failure Scenario** (If there's a bug):
```json
{
  "summary": {
    "total": 6,
    "passed": 3,
    "failed": 3
  },
  "scenarios": [
    {
      "scenario": "System index search (.kibana) with project_routing=_alias:project-b",
      "success": false,
      "statusCode": 400,
      "error": "Bad Request",
      "details": {
        "message": "Request failed - ES rejected project_routing for internal user"
      }
    }
    // ...
  ]
}
```

### Step 7: Run Targeted Tests

If you need to test specific scenarios:

```bash
curl -X POST https://your-project.qa.elastic.co/internal/cps_test/run_scenario \
  -u username:password \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "index": ".kibana",
    "projectRouting": "_alias:project-b-id",
    "query": {"match_all": {}}
  }'
```

## Troubleshooting

### Plugin Not Found

**Symptom**: `/internal/cps_test/health` returns 404

**Solutions**:
1. Verify the plugin is included in the build
2. Check Kibana logs for plugin loading errors
3. Ensure `kibana.jsonc` is correct and the plugin is in the right location
4. Restart Kibana after changes

### Authentication Errors

**Symptom**: 401 Unauthorized

**Solutions**:
1. Verify credentials are correct
2. For local: Use `elastic_serverless:changeme`
3. For QA: Use proper user credentials with appropriate permissions
4. Check if authentication type is correct (basic auth)

### XSRF Errors

**Symptom**: 400 Bad Request with "xsrf" error

**Solutions**:
1. Always include `'kbn-xsrf': 'true'` header
2. In browser console, the browser automatically handles cookies

### CPS Not Configured

**Symptom**: Tests pass but you're unsure if CPS is actually enabled

**Solutions**:
1. Verify ES is running in CPS mode (locally: check ES startup logs)
2. In QA: Confirm projects are properly linked
3. Try querying indices that only exist in the linked project
4. Check project metadata/config for CPS settings

### Type Errors in Console

**Symptom**: TypeScript errors in the route code

**Solutions**:
- The `as any` casts are intentional for the `project_routing` parameter
- These are expected because `project_routing` is a CPS-specific parameter not in standard types

## Expected Outcomes

Based on the task description, we expect:

✅ **ES accepts** `project_routing` parameter from internal user
✅ **ES routes** internal user requests to origin only (ignoring the project_routing value)
✅ **All tests pass** without 400 errors

If tests fail, it indicates:
❌ ES is rejecting `project_routing` from internal user
❌ There may be a configuration or implementation issue with CPS + internal user handling

## Cleanup

After validation is complete:

1. **Remove the plugin** from production builds (it's a test plugin)
2. **Document findings** from the QA tests
3. **Keep the code** in the repo if it's useful for future CPS validation
4. Consider moving it to a feature-flagged state if ongoing testing is needed

## Getting Help

If you encounter issues:
- Check Kibana server logs for errors
- Check Elasticsearch logs for request rejections
- Review the CPS integration test for reference: `src/core/server/integration_tests/elasticsearch/project_routing_serverless_cps.test.ts`
- Consult with the Core team (@elastic/kibana-core)

