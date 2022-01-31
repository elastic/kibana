[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ISpacesClient

# Interface: ISpacesClient

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ISpacesClient

Client interface for interacting with spaces.

## Table of contents

### Methods

- [create](client.__internalNamespace.ISpacesClient.md#create)
- [delete](client.__internalNamespace.ISpacesClient.md#delete)
- [disableLegacyUrlAliases](client.__internalNamespace.ISpacesClient.md#disablelegacyurlaliases)
- [get](client.__internalNamespace.ISpacesClient.md#get)
- [getAll](client.__internalNamespace.ISpacesClient.md#getall)
- [update](client.__internalNamespace.ISpacesClient.md#update)

## Methods

### create

▸ **create**(`space`): `Promise`<[`Space`](client.__internalNamespace.Space.md)\>

Creates a space.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `space` | [`Space`](client.__internalNamespace.Space.md) | the space to create. |

#### Returns

`Promise`<[`Space`](client.__internalNamespace.Space.md)\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:22

___

### delete

▸ **delete**(`id`): `Promise`<`void`\>

Deletes a space, and all saved objects belonging to that space.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | the id of the space to delete. |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:33

___

### disableLegacyUrlAliases

▸ **disableLegacyUrlAliases**(`aliases`): `Promise`<`void`\>

Disables the specified legacy URL aliases.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `aliases` | [`LegacyUrlAliasTarget`](client.__internalNamespace.LegacyUrlAliasTarget.md)[] | the aliases to disable. |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:38

___

### get

▸ **get**(`id`): `Promise`<[`Space`](client.__internalNamespace.Space.md)\>

Retrieve a space by its id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | the space id. |

#### Returns

`Promise`<[`Space`](client.__internalNamespace.Space.md)\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:17

___

### getAll

▸ **getAll**(`options?`): `Promise`<[`GetSpaceResult`](client.__internalNamespace.GetSpaceResult.md)[]\>

Retrieve all available spaces.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options?` | [`GetAllSpacesOptions`](client.__internalNamespace.GetAllSpacesOptions.md) | controls which spaces are retrieved. |

#### Returns

`Promise`<[`GetSpaceResult`](client.__internalNamespace.GetSpaceResult.md)[]\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:12

___

### update

▸ **update**(`id`, `space`): `Promise`<[`Space`](client.__internalNamespace.Space.md)\>

Updates a space.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | the id of the space to update. |
| `space` | [`Space`](client.__internalNamespace.Space.md) | the updated space. |

#### Returns

`Promise`<[`Space`](client.__internalNamespace.Space.md)\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:28
