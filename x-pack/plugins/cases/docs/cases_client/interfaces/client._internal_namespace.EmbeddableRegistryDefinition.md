[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / EmbeddableRegistryDefinition

# Interface: EmbeddableRegistryDefinition<P\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).EmbeddableRegistryDefinition

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends [`EmbeddableStateWithType`](../modules/client._internal_namespace.md#embeddablestatewithtype) = [`EmbeddableStateWithType`](../modules/client._internal_namespace.md#embeddablestatewithtype) |

## Hierarchy

- [`PersistableStateDefinition`](../modules/client._internal_namespace.md#persistablestatedefinition)<`P`\>

  ↳ **`EmbeddableRegistryDefinition`**

## Table of contents

### Properties

- [id](client._internal_namespace.EmbeddableRegistryDefinition.md#id)
- [migrations](client._internal_namespace.EmbeddableRegistryDefinition.md#migrations)

### Methods

- [extract](client._internal_namespace.EmbeddableRegistryDefinition.md#extract)
- [inject](client._internal_namespace.EmbeddableRegistryDefinition.md#inject)
- [telemetry](client._internal_namespace.EmbeddableRegistryDefinition.md#telemetry)

## Properties

### id

• **id**: `string`

#### Defined in

src/plugins/embeddable/target/types/server/types.d.ts:13

___

### migrations

• `Optional` **migrations**: [`MigrateFunctionsObject`](../modules/client._internal_namespace.md#migratefunctionsobject) \| [`GetMigrationFunctionObjectFn`](../modules/client._internal_namespace.md#getmigrationfunctionobjectfn)

A list of migration functions, which migrate the persistable state
serializable object to the next version. Migration functions should are
keyed by the Kibana version using semver, where the version indicates to
which version the state will be migrated to.

#### Inherited from

PersistableStateDefinition.migrations

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:75

## Methods

### extract

▸ `Optional` **extract**(`state`): `Object`

A function which receives state and should return the state with references
extracted and an array of the extracted references. The default case could
simply return the same state with an empty array of references.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `state` | `P` | The persistable state serializable state object. |

#### Returns

`Object`

Persistable state object with references extracted and a list of
         references.

| Name | Type |
| :------ | :------ |
| `references` | [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[] |
| `state` | `P` |

#### Inherited from

PersistableStateDefinition.extract

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:65

___

### inject

▸ `Optional` **inject**(`state`, `references`): `P`

A function which receives state and a list of references and should return
back the state with references injected. The default is an identity
function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `state` | `P` | The persistable state serializable state object. |
| `references` | [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[] | List of saved object references. |

#### Returns

`P`

Persistable state object with references injected.

#### Inherited from

PersistableStateDefinition.inject

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:55

___

### telemetry

▸ `Optional` **telemetry**(`state`, `stats`): `Record`<`string`, `any`\>

Function which reports telemetry information. This function is essentially
a "reducer" - it receives the existing "stats" object and returns an
updated version of the "stats" object.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `state` | `P` | The persistable state serializable state object. |
| `stats` | `Record`<`string`, `any`\> | Stats object containing the stats which were already              collected. This `stats` object shall not be mutated in-line. |

#### Returns

`Record`<`string`, `any`\>

A new stats object augmented with new telemetry information.

#### Inherited from

PersistableStateDefinition.telemetry

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:45
