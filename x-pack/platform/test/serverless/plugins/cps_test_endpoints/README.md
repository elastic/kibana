# CPS Test Endpoints Plugin

This test plugin provides HTTP endpoints to verify Cross-Project Search (CPS) behavior with the internal user in serverless environments.

## Purpose

Verify that Elasticsearch correctly routes internal user requests to the origin project, even when `project_routing` is set to values other than origin. This is critical for ensuring CPS works correctly in linked serverless projects.

## Test Scenarios

The plugin tests two main scenarios:

1. **System Index Search**: Search a system index (e.g., `.kibana`) with various `project_routing` values
2. **Data Index Search**: Search a data index (e.g., `logs-*`) with various `project_routing` values

**IMPORTANT**: The indices you specify should **exist in the origin project** (where Kibana is running), NOT in the linked project. This is because internal user requests are always routed to the origin project, regardless of the `project_routing` value. If you specify an index that only exists in the linked project, the test will correctly show "index not found" - this is expected behavior, not a bug.

### Why This Matters

- **Internal user** → Always routes to origin (ES ignores `project_routing` for internal user)
- **Regular user** → Routes according to `project_routing` (can access linked projects)

So if you test with `kibana_sample_data_flights` that only exists in your linked project:
- ✅ ES accepts the request (doesn't reject with 400 Bad Request)
- ❌ Returns "index not found" because internal user can't see the linked project
- This is **correct behavior**, not a failure!

For each scenario, the plugin uses the **internal user** (via `asInternalUser`) and sets `project_routing` to non-origin values like:
- `your-linked-project-alias` (e.g., `keepbriando-cps-test-proj-linked-ce713c`)
- `_alias:_all` (all linked projects)
- `_alias:_origin` (origin only - for baseline comparison)

## Endpoints

### 1. Run All Tests

**Endpoint**: `POST /internal/cps_test/run_all`

Runs all test scenarios and returns comprehensive results.

**Request Body**:
```json
{
  "systemIndex": ".kibana",           // Optional, default: ".kibana"
  "dataIndex": "logs-*",              // Optional, default: "logs-*"
  "projectRoutingValues": [           // Optional, default: ["_alias:_origin", "_alias:_all"]
    "your-linked-project-alias",      // Replace with actual linked project alias
    "_alias:_all"
  ]
}
```

**Example with real project alias**:
```json
{
  "systemIndex": ".kibana",
  "dataIndex": "logs-*",  // Make sure this exists in YOUR origin project!
  "projectRoutingValues": [
    "keepbriando-cps-test-proj-linked-ce713c",
    "_alias:_all"
  ]
}
```

**⚠️ Important**: Use indices that exist in your **origin project**, not the linked project. The internal user cannot access linked project data, so specifying an index that only exists in the linked project will return "index not found" (which is expected, not an error).

**Response**:
```json
{
  "timestamp": "2026-02-25T10:30:00.000Z",
  "environment": "unknown",
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  },
  "scenarios": [
    {
      "scenario": "System index search (.kibana) with project_routing=_alias:_linked_1",
      "success": true,
      "statusCode": 200,
      "details": {
        "indexSearched": ".kibana",
        "projectRouting": "_alias:_linked_1",
        "hitsCount": 42,
        "message": "Request succeeded - ES accepted project_routing for internal user"
      }
    }
    // ... more scenarios
  ]
}
```

### 2. Run Single Scenario

**Endpoint**: `POST /internal/cps_test/run_scenario`

Run a single targeted test.

**Request Body**:
```json
{
  "index": ".kibana",
  "projectRouting": "your-linked-project-alias",  // Replace with actual alias
  "query": { "match_all": {} }  // Optional
}
```

**Example with real project alias**:
```json
{
  "index": "kibana_sample_data_flights",
  "projectRouting": "keepbriando-cps-test-proj-linked-ce713c",
  "query": { "match_all": {} }
}
```

### 3. Health Check

**Endpoint**: `GET /internal/cps_test/health`

Check if the plugin is running.

## Usage

### Local Testing (in Serverless Mode)

1. **Start Elasticsearch in serverless mode with CPS enabled**:
   ```bash
   yarn es serverless --projectType=oblt
   ```

2. **Start Kibana in serverless mode**:
   ```bash
   yarn serverless-oblt
   ```

3. **Call the test endpoint from browser console** (open http://localhost:5601):
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
       projectRoutingValues: ['_alias:_origin', '_alias:_all']
     })
   }).then(r => r.json()).then(console.log)
   ```

4. **Or use curl**:
   ```bash
   curl -X POST http://localhost:5601/internal/cps_test/run_all \
     -u elastic_serverless:changeme \
     -H 'kbn-xsrf: true' \
     -H 'Content-Type: application/json' \
     -d '{"systemIndex": ".kibana", "dataIndex": "logs-*"}'
   ```

### Testing in Serverless QA

1. **Deploy your changes to a QA serverless project**:
   - Create a PR with this plugin code
   - Deploy the PR to your serverless QA project
   - Ensure you have two CPS projects linked together

2. **Call the endpoint from your terminal**:
   ```bash
   curl -X POST https://your-project.qa.elastic.co/internal/cps_test/run_all \
     -u username:password \
     -H 'kbn-xsrf: true' \
     -H 'Content-Type: application/json' \
     -d '{
       "systemIndex": ".kibana",
       "dataIndex": "kibana_sample_data_flights",
       "projectRoutingValues": ["keepbriando-cps-test-proj-linked-ce713c", "_alias:_all"]
     }'
   ```

   > **Note**: Replace `keepbriando-cps-test-proj-linked-ce713c` with your actual linked project alias. You can find this by running an ESQL query like `FROM <alias>:index_name` in Dev Console.

3. **Or use the browser console** (logged into Kibana):
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
       projectRoutingValues: ['your-linked-project-alias', '_alias:_all']
     })
   }).then(r => r.json()).then(console.log)
   ```

## Finding Your Linked Project Alias

To find your linked project's alias in QA, you can:

1. **Use ESQL in Dev Console**: If you can query cross-project, you already know the alias (e.g., `FROM <alias>:index`)
2. **Check project metadata**: Your QA setup should have documented the linked project configuration
3. **Example format**: Usually looks like `<project-name>-<hash>` (e.g., `keepbriando-cps-test-proj-linked-ce713c`)

## Interpreting Results

### Success Criteria

All scenarios should return `success: true` with `statusCode: 200`. This indicates:
- ✅ ES accepts `project_routing` parameter from internal user
- ✅ ES routes the request to the origin project (doesn't reject it)
- ✅ The search completes successfully

### Failure Indicators

If any scenario returns `success: false`:
- ❌ ES rejected the request (likely with 400 Bad Request)
- ❌ The `project_routing` parameter caused an error
- Check the `error` and `details` fields for more information

## Expected Behavior

According to the task requirements, **ES should route internal user requests to origin only**, meaning:
- Internal user requests should be accepted even with `project_routing` set to non-origin values
- ES will internally override/ignore the `project_routing` for internal users and route to origin
- The requests should succeed without errors

## Plugin Architecture

- **Plugin ID**: `cpsTestEndpoints`
- **Location**: `x-pack/platform/test/serverless/plugins/cps_test_endpoints`
- **Type**: Server-only test plugin
- **Dependencies**: None (uses core only)
- **Routes**: All routes are internal (`/internal/cps_test/*`)

## Cleanup

This is a **test plugin** and should only be used for validation. Consider:
- Removing it from production builds
- Only loading it in test/QA environments
- Using feature flags to control its availability

## Related Documentation

- [CPS Integration Tests](../../../../../src/core/server/integration_tests/elasticsearch/project_routing_serverless_cps.test.ts)
- [Serverless Testing README](../../README.md)
- [Running Kibana in Serverless Mode](../../../../../dev_docs/getting_started/setting_up_a_development_env.mdx)

