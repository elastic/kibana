[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionsConfigurationUtilities

# Interface: ActionsConfigurationUtilities

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionsConfigurationUtilities

## Table of contents

### Methods

- [ensureActionTypeEnabled](client.__internalNamespace.ActionsConfigurationUtilities.md#ensureactiontypeenabled)
- [ensureHostnameAllowed](client.__internalNamespace.ActionsConfigurationUtilities.md#ensurehostnameallowed)
- [ensureUriAllowed](client.__internalNamespace.ActionsConfigurationUtilities.md#ensureuriallowed)
- [getCustomHostSettings](client.__internalNamespace.ActionsConfigurationUtilities.md#getcustomhostsettings)
- [getMicrosoftGraphApiUrl](client.__internalNamespace.ActionsConfigurationUtilities.md#getmicrosoftgraphapiurl)
- [getProxySettings](client.__internalNamespace.ActionsConfigurationUtilities.md#getproxysettings)
- [getResponseSettings](client.__internalNamespace.ActionsConfigurationUtilities.md#getresponsesettings)
- [getSSLSettings](client.__internalNamespace.ActionsConfigurationUtilities.md#getsslsettings)
- [isActionTypeEnabled](client.__internalNamespace.ActionsConfigurationUtilities.md#isactiontypeenabled)
- [isHostnameAllowed](client.__internalNamespace.ActionsConfigurationUtilities.md#ishostnameallowed)
- [isUriAllowed](client.__internalNamespace.ActionsConfigurationUtilities.md#isuriallowed)

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

▸ **getProxySettings**(): `undefined` \| [`ProxySettings`](client.__internalNamespace.ProxySettings.md)

#### Returns

`undefined` \| [`ProxySettings`](client.__internalNamespace.ProxySettings.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:12

___

### getResponseSettings

▸ **getResponseSettings**(): [`ResponseSettings`](client.__internalNamespace.ResponseSettings.md)

#### Returns

[`ResponseSettings`](client.__internalNamespace.ResponseSettings.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_config.d.ts:13

___

### getSSLSettings

▸ **getSSLSettings**(): [`SSLSettings`](client.__internalNamespace.SSLSettings.md)

#### Returns

[`SSLSettings`](client.__internalNamespace.SSLSettings.md)

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
