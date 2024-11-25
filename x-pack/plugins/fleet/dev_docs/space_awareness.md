# Space Awareness

Fleet is in the process to become space aware. This means that different Fleet objects will belong to different spaces and can only be viewed in the spaces that they belong to. Today, all Fleet objects are global and can be viewed from any space.

## How to enable the feature

The feature is behind a feature flag `useSpaceAwareness`. If you are testing space awareness you could also be interested in testing `subfeaturePrivileges` at the same time which enables granular privileges to different parts of Fleet.

In your `kibana.yml` config

```yaml
xpack.fleet.enableExperimental: ['useSpaceAwareness', 'subfeaturePrivileges']
```

After the feature flag is enabled you will have to do another step to opt-in for the feature, that call will migrate the current space agnostic saved objects to new space aware saved objects.

```shell
curl -u elastic:changeme -XPOST "http://localhost:5601/internal/fleet/enable_space_awareness" -H "kbn-xsrf: reporting" -H 'elastic-api-version: 1' -H 'x-elastic-internal-origin: 1'
```

## Space aware entities in Fleet

Some Fleet entities are space-aware while some are global accross all spaces.

`.fleet-*` indices are space aware, for this we added a `namespaces` property, and we added the filtering in our different queries.

Space aware saved object:

- Package policies, `fleet-package-policies`
- Agent policies, `fleet-agent-policies`
- Space settings `fleet-space-settings` (That is used to restrict allowed namespace prefix for policies)

As the feature is opt-in we will have to make sure that both non space-aware and space-aware saved object work, and dynamically use the right object type based on opt-in. Agent policy example:

```typescript
export async function getAgentPolicySavedObjectType() {
  return (await isSpaceAwarenessEnabled())
    ? AGENT_POLICY_SAVED_OBJECT_TYPE
    : LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE;
}
```

Special one:

- Uninstall tokens are space aware, but we still use a space agnostic saved object and we do the filtering using query and application logic, to avoid those documents to be accidentally deleted during a space deletion.

Other saved object like output, settings, fleet server hosts are space agnostic.

## Querying space aware saved object

Depending of your use case, you may want to retrieve policies from a specific space, or policies accross all spaces.
For example during side effects of updating global settings you will have to update all policies accross all spaces, but in a request handler listing policies you probably will return only policies from that space.

#### To retrieve policies in a specific space

You could use the saved object client from a request that is scopped to the request space

```
coreContext.savedObjects.client
```

Or you could use an internal user SO client scopped to the space you need

```typescript
appContextService.getInternalUserSOClientForSpaceId(spaceId).find({ ... })
```

#### To retrieve policies in all spaces

You will have to use an internal user SO client without the space extensions and search accross all namespaces (`*`)

```typescript
appContextService.getInternalUserSOClientWithoutSpaceExtension().find({
  namespaces: ['*'],
});
```

## Testing

As we need the feature flag enabled there is a special test config for space awareness in `x-pack/test/fleet_api_integration/apis/space_awareness` it's important to have test coverage that entities that should only be accessible in a space are not accessible in a other one.
