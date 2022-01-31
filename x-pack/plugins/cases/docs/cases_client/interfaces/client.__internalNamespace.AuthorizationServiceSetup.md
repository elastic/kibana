[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / AuthorizationServiceSetup

# Interface: AuthorizationServiceSetup

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).AuthorizationServiceSetup

Authorization services available on the setup contract of the security plugin.

## Table of contents

### Properties

- [actions](client.__internalNamespace.AuthorizationServiceSetup.md#actions)
- [checkPrivilegesDynamicallyWithRequest](client.__internalNamespace.AuthorizationServiceSetup.md#checkprivilegesdynamicallywithrequest)
- [checkPrivilegesWithRequest](client.__internalNamespace.AuthorizationServiceSetup.md#checkprivilegeswithrequest)
- [checkSavedObjectsPrivilegesWithRequest](client.__internalNamespace.AuthorizationServiceSetup.md#checksavedobjectsprivilegeswithrequest)
- [mode](client.__internalNamespace.AuthorizationServiceSetup.md#mode)

## Properties

### actions

• **actions**: [`Actions`](../classes/client.__internalNamespace.Actions.md)

Actions are used to create the "actions" that are associated with Elasticsearch's
application privileges, and are used to perform the authorization checks implemented
by the various `checkPrivilegesWithRequest` derivatives.

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:52

___

### checkPrivilegesDynamicallyWithRequest

• **checkPrivilegesDynamicallyWithRequest**: [`CheckPrivilegesDynamicallyWithRequest`](../modules/client.__internalNamespace.md#checkprivilegesdynamicallywithrequest)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:54

___

### checkPrivilegesWithRequest

• **checkPrivilegesWithRequest**: [`CheckPrivilegesWithRequest`](../modules/client.__internalNamespace.md#checkprivilegeswithrequest)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:53

___

### checkSavedObjectsPrivilegesWithRequest

• **checkSavedObjectsPrivilegesWithRequest**: [`CheckSavedObjectsPrivilegesWithRequest`](../modules/client.__internalNamespace.md#checksavedobjectsprivilegeswithrequest)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:55

___

### mode

• **mode**: [`AuthorizationMode`](client.__internalNamespace.AuthorizationMode-1.md)

#### Defined in

x-pack/plugins/security/target/types/server/authorization/authorization_service.d.ts:56
