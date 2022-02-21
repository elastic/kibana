[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ISpacesClient

# Interface: ISpacesClient

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ISpacesClient

Client interface for interacting with spaces.

## Table of contents

### Methods

- [create](client._internal_namespace.ISpacesClient.md#create)
- [delete](client._internal_namespace.ISpacesClient.md#delete)
- [disableLegacyUrlAliases](client._internal_namespace.ISpacesClient.md#disablelegacyurlaliases)
- [get](client._internal_namespace.ISpacesClient.md#get)
- [getAll](client._internal_namespace.ISpacesClient.md#getall)
- [update](client._internal_namespace.ISpacesClient.md#update)

## Methods

### create

▸ **create**(`space`): `Promise`<[`Space`](client._internal_namespace.Space.md)\>

Creates a space.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `space` | [`Space`](client._internal_namespace.Space.md) | the space to create. |

#### Returns

`Promise`<[`Space`](client._internal_namespace.Space.md)\>

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
| `aliases` | [`LegacyUrlAliasTarget`](client._internal_namespace.LegacyUrlAliasTarget.md)[] | the aliases to disable. |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:38

___

### get

▸ **get**(`id`): `Promise`<[`Space`](client._internal_namespace.Space.md)\>

Retrieve a space by its id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | the space id. |

#### Returns

`Promise`<[`Space`](client._internal_namespace.Space.md)\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:17

___

### getAll

▸ **getAll**(`options?`): `Promise`<[`GetSpaceResult`](client._internal_namespace.GetSpaceResult.md)[]\>

Retrieve all available spaces.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options?` | [`GetAllSpacesOptions`](client._internal_namespace.GetAllSpacesOptions.md) | controls which spaces are retrieved. |

#### Returns

`Promise`<[`GetSpaceResult`](client._internal_namespace.GetSpaceResult.md)[]\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:12

___

### update

▸ **update**(`id`, `space`): `Promise`<[`Space`](client._internal_namespace.Space.md)\>

Updates a space.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | the id of the space to update. |
| `space` | [`Space`](client._internal_namespace.Space.md) | the updated space. |

#### Returns

`Promise`<[`Space`](client._internal_namespace.Space.md)\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_client/spaces_client.d.ts:28
