[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / PersistableState

# Interface: PersistableState<P\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).PersistableState

Persistable state interface can be implemented by something that persists
(stores) state, for example, in a saved object. Once implemented that thing
will gain ability to "extract" and "inject" saved object references, which
are necessary for various saved object tasks, such as export. It will also be
able to do state migrations across Kibana versions, if the shape of the state
would change over time.

**`todo`** Maybe rename it to `PersistableStateItem`?

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends `SerializableRecord` = `SerializableRecord` |

## Table of contents

### Properties

- [migrations](client._internal_namespace.PersistableState.md#migrations)

### Methods

- [extract](client._internal_namespace.PersistableState.md#extract)
- [inject](client._internal_namespace.PersistableState.md#inject)
- [telemetry](client._internal_namespace.PersistableState.md#telemetry)

## Properties

### migrations

• **migrations**: [`MigrateFunctionsObject`](../modules/client._internal_namespace.md#migratefunctionsobject) \| [`GetMigrationFunctionObjectFn`](../modules/client._internal_namespace.md#getmigrationfunctionobjectfn)

A list of migration functions, which migrate the persistable state
serializable object to the next version. Migration functions should are
keyed by the Kibana version using semver, where the version indicates to
which version the state will be migrated to.

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:75

## Methods

### extract

▸ **extract**(`state`): `Object`

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

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:65

___

### inject

▸ **inject**(`state`, `references`): `P`

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

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:55

___

### telemetry

▸ **telemetry**(`state`, `stats`): `Record`<`string`, `any`\>

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

#### Defined in

src/plugins/kibana_utils/target/types/common/persistable_state/types.d.ts:45
