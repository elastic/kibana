[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / AuthFilterHelpers

# Interface: AuthFilterHelpers

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).AuthFilterHelpers

Defines the helper methods and necessary information for authorizing the find API's request.

## Table of contents

### Properties

- [ensureSavedObjectsAreAuthorized](client.__internalNamespace.AuthFilterHelpers.md#ensuresavedobjectsareauthorized)
- [filter](client.__internalNamespace.AuthFilterHelpers.md#filter)

## Properties

### ensureSavedObjectsAreAuthorized

• **ensureSavedObjectsAreAuthorized**: [`EnsureSOAuthCallback`](../modules/client.__internalNamespace.md#ensuresoauthcallback)

Utility function for checking that the returned entities are in fact authorized for the user making the request

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:123](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/authorization/types.ts#L123)

___

### filter

• `Optional` **filter**: `KueryNode`

The owner filter to pass to the saved object client's find operation that is scoped to the authorized owners

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:119](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/authorization/types.ts#L119)
