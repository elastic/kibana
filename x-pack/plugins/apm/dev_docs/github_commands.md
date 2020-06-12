### Useful Github Pull Request commands

The following commands can be executed by writing them as comments on a pull request:

- `@elasticmachine merge upstream`: Will merge the upstream (eg. master or 7.x) into the branch. This is useful if a bug has been fixed upstream and the fix is necessary to pass CI checks
- `retest` Re-run the tests. This is useful if a flaky test caused the build to fail
