# Lens Functional Tests

This directory contains functional tests for the Lens visualization editor.

## Test Groups Overview

| Group | Description | ~Duration |
|-------|-------------|-----------|
| group1-6 | Core Lens functionality tests | varies |
| group7 | ES\|QL tests | ~10-15 min |
| group8 | LogsDB upgrade scenarios | ~20 min |
| group9 | TSDB upgrade scenarios | ~15 min |
| group10 | LogsDB downgrade scenarios | ~20 min |
| group11 | TSDB downgrade scenarios | ~15 min |

---

## LogsDB & TSDB Scenario-Based Tests

Groups 8-11 use a **scenario-based testing pattern** to verify Lens works correctly with different Elasticsearch index modes and their combinations.

### What is LogsDB?

**LogsDB** is an Elasticsearch index mode optimized for log data. It uses:
- Synthetic `_source` for storage efficiency
- Dimension fields (like `host.name`) for efficient grouping
- Special handling for log-specific patterns

### What is TSDB?

**TSDB** (Time Series Database) is an Elasticsearch index mode for metrics/time series data. It features:
- Counter and gauge field types with specific aggregation restrictions
- Downsampling support for data rollup
- Time series dimensions for efficient querying

---

## Scenario Testing Pattern

### Why Test Multiple Index Combinations?

Real-world Kibana Data Views often span multiple indices of different types:
- A `logs-*` pattern might match both LogsDB streams and legacy regular indices
- During migrations, old and new index formats coexist
- Users may combine different data sources in a single visualization

### The 6 LogsDB Scenarios

Each scenario represents a **Data View configuration** combining different index types:

| # | Scenario | Indexes in Data View | Purpose |
|---|----------|---------------------|---------|
| 1 | No additional stream/index | `[logsdb_stream]` | Baseline: Pure LogsDB only |
| 2 | No additional + no host.name | `[logsdb_stream_no_host]` | LogsDB without dimension field |
| 3 | + Regular index | `[logsdb_stream, regular_index]` | Mix with standard ES index |
| 4 | + LogsDB stream | `[logsdb_stream, logsdb_index_2]` | Two LogsDB streams |
| 5 | + TSDB stream | `[logsdb_stream, tsdb_index]` | Mix with Time Series DB |
| 6 | + TSDB downsampled | `[logsdb_stream, tsdb_downsampled]` | Mix with downsampled TSDB |

### The 5 TSDB Scenarios

| # | Scenario | Indexes in Data View | Purpose |
|---|----------|---------------------|---------|
| 1 | No additional stream/index | `[tsdb_stream]` | Baseline: Pure TSDB only |
| 2 | + Regular index | `[tsdb_stream, regular_index]` | Mix with standard ES index |
| 3 | + Downsampled TSDB | `[tsdb_stream, tsdb_downsampled]` | Mix with downsampled data |
| 4 | + Regular + Downsampled | `[tsdb_stream, regular, downsampled]` | Three-way mix |
| 5 | + Additional TSDB | `[tsdb_stream, tsdb_index_2]` | Two TSDB streams |

---

## Upgrade vs Downgrade Testing

### Upgrade Scenarios (Groups 8 & 9)

Tests when a regular data stream is **upgraded** to LogsDB/TSDB:

```
Time: ──────────────────────────────────────────→
      [Regular stream data] │ [LogsDB/TSDB data]
                            ↑
                     Upgrade point
```

**What's tested**: Lens can visualize data spanning both pre-upgrade (regular) and post-upgrade (specialized) periods.

### Downgrade Scenarios (Groups 10 & 11)

Tests when a LogsDB/TSDB stream is **downgraded** to regular:

```
Time: ──────────────────────────────────────────→
      [LogsDB/TSDB data] │ [Regular stream data]
                         ↑
                  Downgrade point
```

**What's tested**: Lens handles transitions when special features are no longer available for new data.

---

## Technical Challenges Being Tested

### 1. Field Type Conflicts
LogsDB uses `host.name` as a dimension field with special handling. When mixed with regular indices, Lens must handle the field correctly across both.

### 2. Aggregation Compatibility
TSDB has restrictions (e.g., counter fields can't use `average`). When a Data View spans LogsDB + TSDB, Lens must enforce the stricter rules.

### 3. Downsampled Data
TSDB downsampling pre-aggregates data, changing which functions are valid (e.g., `median` shows warnings). Mixing this with other index types tests that Lens properly detects and handles these restrictions.

### 4. Time Window Transitions
Tests verify data is visible when the time picker spans across upgrade/downgrade boundaries.

---

## Test Multiplication

Each scenario runs **5 tests** per block:
1. Date histogram chart
2. Date histogram with different date field
3. Annotation layer
4. Annotation layer with alternate time field
5. ES|QL query visualization

**LogsDB total**: `6 scenarios × 5 tests × 2 blocks = 60 tests + 1 smoke test = 61`
**TSDB total**: `5 scenarios × 2-3 tests × 2 blocks + downsampling + field type tests ≈ 35 tests`

---

## Related Files

- `tsdb_logsdb_helpers.ts` - Shared utilities for scenario setup and test runners
- `group8/logsdb.ts` - LogsDB upgrade scenarios
- `group9/tsdb.ts` - TSDB upgrade scenarios  
- `group10/logsdb_downgrade.ts` - LogsDB downgrade scenarios
- `group11/tsdb_downgrade.ts` - TSDB downgrade scenarios
