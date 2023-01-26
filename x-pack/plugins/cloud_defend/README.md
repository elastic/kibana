# Cloud Defend (for containers)

This plugin currently only exists to provide custom fleet policy UX for a set of new BPF LSM features. The first feature being container "drift prevention".

Drift prevention is a way to block when executables are created or modified. Our agent service detects these events, and applies a set of selectors and responses configured to either block, alert or both.

## Example configuration
```
selectors:
  # default selector (user can modify or remove if they want)
  - name: default
    operation: [createExecutable, modifyExecutable, execMemFd]

  # example custom selector
  - name: nginxOnly
    containerImageName:
      - nginx

  # example selector used for exclude
  - name: excludeCustomNginxBuild
    containerImageTag:
      - staging

# responses are evaluated from top to bottom
# only the first response with a match will run its actions
responses:
  - match: [nginxOnly]
    exclude: [excludeCustomNginxBuild]
    actions: [alert, block]

  # default response
  # delete this if no default response needed
  - match: [default]
    actions: [alert]
```

---

## Development

## pre commit checks

```
node scripts/type_check.js --project x-pack/plugins/cloud_defend/tsconfig.json
yarn test:jest x-pack/plugins/cloud_defend
```

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
