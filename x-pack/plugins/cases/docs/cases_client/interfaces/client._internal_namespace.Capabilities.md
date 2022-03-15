[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / Capabilities

# Interface: Capabilities

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).Capabilities

The read-only set of capabilities available for the current UI session.
Capabilities are simple key-value pairs of (string, boolean), where the string denotes the capability ID,
and the boolean is a flag indicating if the capability is enabled or disabled.

## Indexable

▪ [key: `string`]: `Record`<`string`, `boolean` \| `Record`<`string`, `boolean`\>\>

Custom capabilities, registered by plugins.

## Table of contents

### Properties

- [catalogue](client._internal_namespace.Capabilities.md#catalogue)
- [management](client._internal_namespace.Capabilities.md#management)
- [navLinks](client._internal_namespace.Capabilities.md#navlinks)

## Properties

### catalogue

• **catalogue**: `Record`<`string`, `boolean`\>

Catalogue capabilities. Catalogue entries drive the visibility of the Kibana homepage options.

#### Defined in

src/core/target/types/types/capabilities.d.ts:16

___

### management

• **management**: `Object`

Management section capabilities.

#### Index signature

▪ [sectionId: `string`]: `Record`<`string`, `boolean`\>

#### Defined in

src/core/target/types/types/capabilities.d.ts:12

___

### navLinks

• **navLinks**: `Record`<`string`, `boolean`\>

Navigation link capabilities.

#### Defined in

src/core/target/types/types/capabilities.d.ts:10
