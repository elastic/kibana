# Deployment & Testing Checklist

## ✅ Code Status

- [x] Plugin structure created
- [x] Routes implemented with internal user logic
- [x] No linter errors
- [x] TypeScript compiles
- [x] Documentation complete
- [x] Examples updated with real project aliases

## 🚀 Deployment to QA

### Step 1: Commit Your Changes

```bash
cd /Users/briando/projects/kibana

# Check what we're adding
git status

# Add the plugin
git add x-pack/platform/test/serverless/plugins/cps_test_endpoints

# Commit
git commit -m "Add CPS test endpoints plugin for internal user validation

This plugin provides HTTP endpoints to verify ES correctly handles
project_routing parameters from internal user in CPS environments.

Tests verify that ES accepts project_routing from internal user
(doesn't reject with 400) and routes to origin only.
"

# Push to your branch
git push origin YOUR_BRANCH_NAME
```

### Step 2: Create PR (if needed)

1. Go to GitHub
2. Create PR from your branch
3. Title: "Add CPS test endpoints for internal user validation"
4. Description: Link to task and explain the purpose

### Step 3: Deploy to QA Serverless Project

**Prerequisites**:
- Two linked CPS projects in QA
- Origin project (where Kibana runs)
- Linked project (for CPS queries)

**Deployment options**:
1. **PR deployment**: Your team's automation deploys PR to test environment
2. **Manual deployment**: Build and deploy Docker image with your changes
3. **Cloud deployment**: Use cloud deployment tools to update the project

### Step 4: Verify Plugin Loaded

Once deployed, check if plugin is running:

```bash
curl https://YOUR-ORIGIN-PROJECT.qa.elastic.co/internal/cps_test/health \
  -u YOUR_USERNAME:YOUR_PASSWORD
```

**Expected response**:
```json
{
  "status": "ok",
  "message": "CPS Test Endpoints plugin is running",
  "timestamp": "2026-02-25T..."
}
```

**If 404**: Plugin didn't load. Check:
- Kibana server logs for plugin loading errors
- Plugin is included in the build
- Kibana restarted after deployment

## 🧪 Testing in QA

### Quick Test (Recommended First)

```bash
curl -X POST https://YOUR-ORIGIN-PROJECT.qa.elastic.co/internal/cps_test/run_all \
  -u YOUR_USERNAME:YOUR_PASSWORD \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "systemIndex": ".kibana",
    "dataIndex": "logs-*",
    "projectRoutingValues": [
      "YOUR-LINKED-PROJECT-ALIAS",
      "_alias:_all"
    ]
  }' | jq '.'
```

**Replace**:
- `YOUR-ORIGIN-PROJECT.qa.elastic.co` → Your origin project URL
- `YOUR_USERNAME:YOUR_PASSWORD` → Your credentials
- `YOUR-LINKED-PROJECT-ALIAS` → e.g., `keepbriando-cps-test-proj-linked-ce713c`

### Interpret Results

#### ✅ Success (Hypothesis Confirmed)

```json
{
  "summary": { "total": 4, "passed": 4, "failed": 0 }
}
```

**Meaning**: 
- ES accepts `project_routing` from internal user ✅
- No 400 Bad Request errors ✅
- Hypothesis confirmed! ✅

#### ❌ Failure (Bug Found)

```json
{
  "summary": { "total": 4, "passed": 0, "failed": 4 },
  "scenarios": [
    {
      "statusCode": 400,
      "error": "Bad Request"
    }
  ]
}
```

**Meaning**:
- ES is rejecting `project_routing` from internal user ❌
- Bug found - ES behavior doesn't match expectation ❌
- Need to investigate with ES team ❌

#### ⚠️ Mixed Results

```json
{
  "summary": { "total": 4, "passed": 2, "failed": 2 }
}
```

**Check**:
- Which scenarios failed?
- Are failures due to "index not found"? (expected if index doesn't exist in origin)
- Or 400 errors? (unexpected - indicates bug)

### Single Scenario Test (Debugging)

```bash
curl -X POST https://YOUR-PROJECT.qa.elastic.co/internal/cps_test/run_scenario \
  -u username:password \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "index": ".kibana",
    "projectRouting": "YOUR-LINKED-ALIAS"
  }'
```

## 📝 Document Findings

After testing, document:

### If All Tests Pass ✅

```
RESULT: Hypothesis confirmed

ES correctly handles project_routing from internal user:
- Accepts the parameter (no 400 errors)
- Routes to origin only
- Requests succeed when index exists in origin

Test Results:
- Total scenarios: 4
- Passed: 4
- Failed: 0

Conclusion: ES behavior matches expectations. Internal user
requests with project_routing are accepted but routed to origin.
```

### If Tests Fail ❌

```
RESULT: Issue found

ES rejects project_routing from internal user with 400 Bad Request.

Test Results:
- Total scenarios: 4
- Passed: 0
- Failed: 4 (all with 400 status code)

Error message: [include actual error from response]

Next steps: 
- Investigate ES logs
- Check ES configuration
- Consult with ES team about internal user + project_routing handling
```

## 🧹 Cleanup (After Testing)

Once validation is complete:

1. **Keep the plugin** if it's useful for future testing
2. **Remove from builds** if it was just for one-time validation
3. **Document findings** in the original task/ticket
4. **Update any related documentation** based on findings

## 📚 Reference Documents

Quick access to plugin docs:
- `README.md` - Overview and endpoints
- `TESTING_GUIDE.md` - Detailed testing steps
- `QUICK_REFERENCE.md` - Copy-paste commands for QA
- `SUMMARY.md` - Implementation overview

## ⚠️ Common Issues

### Issue: Plugin not loading
**Solution**: Check Kibana logs, verify plugin in build, restart Kibana

### Issue: 401 Unauthorized
**Solution**: Check credentials, ensure user has proper permissions

### Issue: "index not found" in results
**Solution**: Use indices from origin project, not linked project

### Issue: XSRF errors
**Solution**: Include `'kbn-xsrf': 'true'` header in all POST requests

## 🎯 Success Criteria

You've successfully completed the task when:

1. ✅ Plugin deploys to QA without errors
2. ✅ Health check endpoint responds
3. ✅ Test endpoints execute successfully
4. ✅ Results clearly show whether hypothesis is confirmed
5. ✅ Findings are documented

## Next Steps After Testing

1. **Share results** with the team
2. **Update task** with findings
3. **Remove test plugin** from production builds (if temporary)
4. **Consider** adding automated tests if needed

