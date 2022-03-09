[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionsConfigurationUtilities

# Interface: ActionsConfigurationUtilities

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionsConfigurationUtilities

## Table of contents

### Methods

- [ensureActionTypeEnabled](client._internal_namespace.ActionsConfigurationUtilities.md#ensureactiontypeenabled)
- [ensureHostnameAllowed](client._internal_namespace.ActionsConfigurationUtilities.md#ensurehostnameallowed)
- [ensureUriAllowed](client._internal_namespace.ActionsConfigurationUtilities.md#ensureuriallowed)
- [getCustomHostSettings](client._internal_namespace.ActionsConfigurationUtilities.md#getcustomhostsettings)
- [getMicrosoftGraphApiUrl](client._internal_namespace.ActionsConfigurationUtilities.md#getmicrosoftgraphapiurl)
- [getProxySettings](client._internal_namespace.ActionsConfigurationUtilities.md#getproxysettings)
- [getResponseSettings](client._internal_namespace.ActionsConfigurationUtilities.md#getresponsesettings)
- [getSSLSettings](client._internal_namespace.ActionsConfigurationUtilities.md#getsslsettings)
- [isActionTypeEnabled](client._internal_namespace.ActionsConfigurationUtilities.md#isactiontypeenabled)
- [isHostnameAllowed](client._internal_namespace.ActionsConfigurationUtilities.md#ishostnameallowed)
- [isUriAllowed](client._internal_namespace.ActionsConfigurationUtilities.md#isuriallowed)

## Methods

### ensureActionTypeEnabled

▸ **ensureActionTypeEnabled**(`actionType`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionType` | `string` |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:10

___

### ensureHostnameAllowed

▸ **ensureHostnameAllowed**(`hostname`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `hostname` | `string` |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:8

___

### ensureUriAllowed

▸ **ensureUriAllowed**(`uri`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `uri` | `string` |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:9

___

### getCustomHostSettings

▸ **getCustomHostSettings**(`targetUrl`): `undefined` \| `Readonly`<{ `smtp?`: `Readonly`<{ `ignoreTLS?`: `boolean` ; `requireTLS?`: `boolean`  }\> ; `ssl?`: `Readonly`<{ `certificateAuthoritiesData?`: `string` ; `certificateAuthoritiesFiles?`: `string` \| `string`[] ; `rejectUnauthorized?`: `boolean` ; `verificationMode?`: ``"none"`` \| ``"certificate"`` \| ``"full"``  }\>  } & { `url`: `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `targetUrl` | `string` |

#### Returns

`undefined` \| `Readonly`<{ `smtp?`: `Readonly`<{ `ignoreTLS?`: `boolean` ; `requireTLS?`: `boolean`  }\> ; `ssl?`: `Readonly`<{ `certificateAuthoritiesData?`: `string` ; `certificateAuthoritiesFiles?`: `string` \| `string`[] ; `rejectUnauthorized?`: `boolean` ; `verificationMode?`: ``"none"`` \| ``"certificate"`` \| ``"full"``  }\>  } & { `url`: `string`  }\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:14

___

### getMicrosoftGraphApiUrl

▸ **getMicrosoftGraphApiUrl**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:15

___

### getProxySettings

▸ **getProxySettings**(): `undefined` \| [`ProxySettings`](client._internal_namespace.ProxySettings.md)

#### Returns

`undefined` \| [`ProxySettings`](client._internal_namespace.ProxySettings.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:12

___

### getResponseSettings

▸ **getResponseSettings**(): [`ResponseSettings`](client._internal_namespace.ResponseSettings.md)

#### Returns

[`ResponseSettings`](client._internal_namespace.ResponseSettings.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:13

___

### getSSLSettings

▸ **getSSLSettings**(): [`SSLSettings`](client._internal_namespace.SSLSettings.md)

#### Returns

[`SSLSettings`](client._internal_namespace.SSLSettings.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:11

___

### isActionTypeEnabled

▸ **isActionTypeEnabled**(`actionType`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionType` | `string` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:7

___

### isHostnameAllowed

▸ **isHostnameAllowed**(`hostname`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `hostname` | `string` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:5

___

### isUriAllowed

▸ **isUriAllowed**(`uri`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `uri` | `string` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:6
