# Transform API Tests - Migration Report

## Quick Overview

| Metric | Value |
|--------|-------|
| **Test Files** | 12 |
| **Endpoints Tested** | 14 |
| **Total Test Cases** | ~50+ |
| **ES Archive** | `ml/farequote` |
| **Test Users** | 3 (poweruser, viewer, unauthorized) |
| **Migration Risk** | 🟡 Medium |

## Test Suite Breakdown

| File | Endpoint | Tests | Key Features |
|------|----------|-------|--------------|
| [delete_transforms.ts](delete_transforms.ts:30) | `POST /internal/transform/delete_transforms` | 8 | Single/bulk delete, with/without dest index/data view deletion |
| [reset_transforms.ts](reset_transforms.ts:38) | `POST /internal/transform/reset_transforms` | 5 | Reset stats (pages processed, checkpoints) |
| [start_transforms.ts](start_transforms.ts:30) | `POST /internal/transform/start_transforms` | 5 | Single/bulk start operations |
| [stop_transforms.ts](stop_transforms.ts:45) | `POST /internal/transform/stop_transforms` | 5 | Uses continuous transforms for testing |
| [schedule_now_transforms.ts](schedule_now_transforms.ts:29) | `POST /internal/transform/schedule_now_transforms` | 5 | Trigger immediate execution |
| [transforms.ts](transforms.ts:78) | `GET /internal/transform/transforms[/{id}]` | 5 | List all & get single transform |
| [transforms_nodes.ts](transforms_nodes.ts:30) | `GET /internal/transform/transforms/_nodes` | 3 | Node count validation |
| [transforms_preview.ts](transforms_preview.ts:38) | `POST /internal/transform/transforms/_preview` | 3 | Preview with error handling |
| [transforms_stats.ts](transforms_stats.ts:79) | `GET /internal/transform/transforms[/{id}]/_stats` | 4 | Stats for all/single transform |
| [transforms_update.ts](transforms_update.ts:60) | `POST /internal/transform/transforms/{id}/_update` | 2 | Update config (source, desc, dest, freq) |
| [reauthorize_transforms.ts](reauthorize_transforms.ts:50) | `POST /internal/transform/reauthorize_transforms` | 4 | API key reauthorization, health checks |
| [transforms_create.ts](transforms_create.ts:20) | `PUT /internal/transform/transforms/{id}` | 4 | Create with/without data views |

## Test Coverage Matrix

| Endpoint | Auth ✓ | Bulk ✓ | Errors ✓ | Invalid IDs ✓ |
|----------|--------|--------|----------|---------------|
| delete_transforms | ✅ | ✅ | ✅ | ✅ |
| reset_transforms | ✅ | ✅ | ✅ | ✅ |
| start_transforms | ✅ | ✅ | ✅ | ✅ |
| stop_transforms | ✅ | ✅ | ✅ | ✅ |
| schedule_now_transforms | ✅ | ✅ | ✅ | ✅ |
| transforms (GET) | ✅ | N/A | ✅ | ✅ |
| transforms_nodes | ✅ | N/A | ✅ | N/A |
| transforms_preview | ✅ | N/A | ✅ | N/A |
| transforms_stats | ✅ | N/A | N/A | N/A |
| transforms_update | ✅ | N/A | N/A | N/A |
| reauthorize_transforms | ✅ | ✅ | ✅ | ✅ |
| transforms_create | N/A | N/A | ✅ | N/A |

## Dependencies

### Data Archive
```
x-pack/platform/test/fixtures/es_archives/ml/farequote/
├── data.json.gz          # Flight fare quote data
└── mappings.json         # Index mappings
```
**Source Index**: `ft_farequote`
**Key Fields**: `airline`, `@timestamp`

### Services Used
| Service | Purpose | Location |
|---------|---------|----------|
| `transform.api` | Transform CRUD, state polling, cleanup | [services/transform/api.ts](../../services/transform/api.ts) |
| `transform.securityCommon` | Users, roles, API keys | [services/transform/security_common.ts](../../services/transform/security_common.ts) |
| `transform.testResources` | Timezone, data views | From ML services |
| `supertestWithoutAuth` | HTTP client | Standard FTR |

### Test Users
| User | Permissions | Usage |
|------|-------------|-------|
| `TRANSFORM_POWERUSER` | Full access | Success cases |
| `TRANSFORM_VIEWER` | Read-only | 403 error cases |
| `TRANSFORM_UNAUTHORIZED` | None | 403 error cases |

## Scout Migration Assessment

### ✅ Easy (No Issues)
- ✅ HTTP endpoint testing
- ✅ ES archive loading
- ✅ User/role management
- ✅ Request/response validation
- ✅ Bulk operations

### 🟡 Medium (Needs Adaptation)
| Item | FTR Approach | Scout Solution | Effort |
|------|-------------|----------------|--------|
| Transform helpers | `transform.api` service | Create `ApiServices.transform` | Medium |
| State polling | Custom `waitForTransformState()` | Use Scout's retry utilities | Low |
| Data views | `transform.testResources` | Direct data views API calls | Low |
| Timezone setup | `setKibanaTimeZoneToUTC()` | Implement in Scout setup | Low |
| ML dependencies | Import from ML services | Duplicate or share utilities | Low |

### 🔴 Potential Challenges
| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **API Key Auth** (reauthorize tests) | Medium | Ensure Scout supports `es-secondary-authorization` header |
| **Transform State Polling** | Medium | Implement robust retry with proper timeouts |
| **Continuous Transforms** | Low | Same pattern works, verify timing |
| **Test Isolation** | Low | Thorough cleanup between tests |

## Standard Transform Config
```javascript
{
  source: { index: ['ft_farequote'] },
  pivot: {
    group_by: { airline: { terms: { field: 'airline' } } },
    aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } }
  },
  dest: { index: 'user-{transformId}' },
  sync: { time: { field: '@timestamp', delay: '60s' } } // if continuous
}
```

## Recommended Migration Order

| Phase | Files | Complexity | Notes |
|-------|-------|------------|-------|
| **1** | transforms, transforms_stats, transforms_nodes | 🟢 Low | Simple GET operations |
| **2** | transforms_create, transforms_update | 🟡 Medium | CRUD operations |
| **3** | start, stop, reset, schedule_now | 🟡 Medium | Lifecycle + state polling |
| **4** | delete_transforms | 🟡 Medium | Complex cleanup scenarios |
| **5** | reauthorize_transforms | 🔴 High | API key management |
| **6** | transforms_preview | 🟢 Low | Error validation |

## Key Migration Tasks

**Must Implement**:
1. ✅ Transform API service wrapper (`ApiServices.transform`)
2. ✅ Polling/retry utilities for transform states
3. ✅ API key management for reauthorization tests
4. ✅ Data view API integration
5. ✅ Timezone configuration helpers

**Should Verify**:
- Scout's ES archive compatibility
- Header support for API keys
- Timing reliability for continuous transforms
- Test isolation/cleanup effectiveness

## Bottom Line

**Migration Feasibility**: ✅ **FEASIBLE**
**Estimated Effort**: 🟡 **Medium** (2-3 days)
**Primary Blocker**: None (API key auth is solvable)
**Recommendation**: Proceed with phased migration starting with GET endpoints
