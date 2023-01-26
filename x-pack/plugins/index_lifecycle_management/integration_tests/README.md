Most plugins of the deployment management team follow
the similar testing infrastructure where integration tests are located in `__jest__` and run as unit tests.

The `index_lifecycle_management` tests [were refactored](https://github.com/elastic/kibana/pull/141750) to be run as integration tests because they [became flaky hitting the 5 seconds timeout](https://github.com/elastic/kibana/issues/115307#issuecomment-1238417474) for a jest unit test.

Jest integration tests are just sit in a different directory and have two main differences:
- They never use parallelism, this allows them to access file system resources, launch services, etc. without needing to worry about conflicts with other tests
- They are allowed to take their sweet time, the default timeout is currently 10 minutes.

To run these tests use: 

```
node scripts/jest_integration x-pack/plugins/index_lifecycle_management/
```