[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / KibanaRequestEvents

# Interface: KibanaRequestEvents

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).KibanaRequestEvents

Request events.

## Table of contents

### Properties

- [aborted$](client.__internalNamespace.KibanaRequestEvents.md#aborted$)
- [completed$](client.__internalNamespace.KibanaRequestEvents.md#completed$)

## Properties

### aborted$

• **aborted$**: `Observable`<`void`\>

Observable that emits once if and when the request has been aborted.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:48

___

### completed$

• **completed$**: `Observable`<`void`\>

Observable that emits once if and when the request has been completely handled.

**`remarks`**
The request may be considered completed if:
- A response has been sent to the client; or
- The request was aborted.

#### Defined in

src/core/target/types/server/http/router/request.d.ts:57
