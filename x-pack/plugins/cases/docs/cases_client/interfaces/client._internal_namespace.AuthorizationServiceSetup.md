[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AuthorizationServiceSetup

# Interface: AuthorizationServiceSetup

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AuthorizationServiceSetup

Authorization services available on the setup contract of the security plugin.

## Table of contents

### Properties

- [actions](client._internal_namespace.AuthorizationServiceSetup.md#actions)
- [checkPrivilegesDynamicallyWithRequest](client._internal_namespace.AuthorizationServiceSetup.md#checkprivilegesdynamicallywithrequest)
- [checkPrivilegesWithRequest](client._internal_namespace.AuthorizationServiceSetup.md#checkprivilegeswithrequest)
- [checkSavedObjectsPrivilegesWithRequest](client._internal_namespace.AuthorizationServiceSetup.md#checksavedobjectsprivilegeswithrequest)
- [mode](client._internal_namespace.AuthorizationServiceSetup.md#mode)

## Properties

### actions

• **actions**: [`Actions`](../classes/client._internal_namespace.Actions.md)

Actions are used to create the "actions" that are associated with Elasticsearch's
application privileges, and are used to perform the authorization checks implemented
by the various `checkPrivilegesWithRequest` derivatives.

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:52

___

### checkPrivilegesDynamicallyWithRequest

• **checkPrivilegesDynamicallyWithRequest**: [`CheckPrivilegesDynamicallyWithRequest`](../modules/client._internal_namespace.md#checkprivilegesdynamicallywithrequest)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:54

___

### checkPrivilegesWithRequest

• **checkPrivilegesWithRequest**: [`CheckPrivilegesWithRequest`](../modules/client._internal_namespace.md#checkprivilegeswithrequest)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:53

___

### checkSavedObjectsPrivilegesWithRequest

• **checkSavedObjectsPrivilegesWithRequest**: [`CheckSavedObjectsPrivilegesWithRequest`](../modules/client._internal_namespace.md#checksavedobjectsprivilegeswithrequest)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:55

___

### mode

• **mode**: [`AuthorizationMode`](client._internal_namespace.AuthorizationMode-1.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:56
