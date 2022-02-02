[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AuthFilterHelpers

# Interface: AuthFilterHelpers

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AuthFilterHelpers

Defines the helper methods and necessary information for authorizing the find API's request.

## Table of contents

### Properties

- [ensureSavedObjectsAreAuthorized](client._internal_namespace.AuthFilterHelpers.md#ensuresavedobjectsareauthorized)
- [filter](client._internal_namespace.AuthFilterHelpers.md#filter)

## Properties

### ensureSavedObjectsAreAuthorized

• **ensureSavedObjectsAreAuthorized**: [`EnsureSOAuthCallback`](../modules/client._internal_namespace.md#ensuresoauthcallback)

Utility function for checking that the returned entities are in fact authorized for the user making the request

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:123](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L123)

___

### filter

• `Optional` **filter**: `KueryNode`

The owner filter to pass to the saved object client's find operation that is scoped to the authorized owners

#### Defined in

[x-pack/plugins/cases/server/authorization/types.ts:119](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/authorization/types.ts#L119)
