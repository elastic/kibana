# CPS Test Endpoints Plugin - MOVED

**This plugin has been moved to**: `x-pack/platform/plugins/private/cps_test_endpoints/`

## Why the move?

Test plugins in `x-pack/platform/test/serverless/plugins/` are only loaded during local FTR testing with explicit `--plugin-path` configuration. They are **NOT** automatically loaded in QA/production serverless deployments.

By moving to `x-pack/platform/plugins/private/cps_test_endpoints/`, the plugin is:
- ✅ Automatically discovered and loaded in all environments
- ✅ Available in QA serverless deployments
- ✅ Part of the standard plugin loading mechanism

## Migration

If you have local changes here, move them to the new location:

```bash
# Old location (deprecated)
x-pack/platform/test/serverless/plugins/cps_test_endpoints/

# New location (current)
x-pack/platform/plugins/private/cps_test_endpoints/
```

This old directory can be deleted after confirming the new location works in QA.

