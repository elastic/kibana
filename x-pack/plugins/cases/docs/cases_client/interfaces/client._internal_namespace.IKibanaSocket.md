[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / IKibanaSocket

# Interface: IKibanaSocket

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).IKibanaSocket

A tiny abstraction for TCP socket.

## Table of contents

### Properties

- [authorizationError](client._internal_namespace.IKibanaSocket.md#authorizationerror)
- [authorized](client._internal_namespace.IKibanaSocket.md#authorized)

### Methods

- [getPeerCertificate](client._internal_namespace.IKibanaSocket.md#getpeercertificate)
- [getProtocol](client._internal_namespace.IKibanaSocket.md#getprotocol)
- [renegotiate](client._internal_namespace.IKibanaSocket.md#renegotiate)

## Properties

### authorizationError

• `Optional` `Readonly` **authorizationError**: `Error`

The reason why the peer's certificate has not been verified. This property becomes available
only when `authorized` is `false`.

#### Defined in

src/core/target/types/server/http/router/socket.d.ts:45

___

### authorized

• `Optional` `Readonly` **authorized**: `boolean`

Indicates whether or not the peer certificate was signed by one of the specified CAs. When TLS
isn't used the value is `undefined`.

#### Defined in

src/core/target/types/server/http/router/socket.d.ts:40

## Methods

### getPeerCertificate

▸ **getPeerCertificate**(`detailed`): ``null`` \| `DetailedPeerCertificate`

#### Parameters

| Name | Type |
| :------ | :------ |
| `detailed` | ``true`` |

#### Returns

``null`` \| `DetailedPeerCertificate`

#### Defined in

src/core/target/types/server/http/router/socket.d.ts:9

▸ **getPeerCertificate**(`detailed`): ``null`` \| `PeerCertificate`

#### Parameters

| Name | Type |
| :------ | :------ |
| `detailed` | ``false`` |

#### Returns

``null`` \| `PeerCertificate`

#### Defined in

src/core/target/types/server/http/router/socket.d.ts:10

▸ **getPeerCertificate**(`detailed?`): ``null`` \| `DetailedPeerCertificate` \| `PeerCertificate`

Returns an object representing the peer's certificate.
The returned object has some properties corresponding to the field of the certificate.
If detailed argument is true the full chain with issuer property will be returned,
if false only the top certificate without issuer property.
If the peer does not provide a certificate, it returns null.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `detailed?` | `boolean` | If true; the full chain with issuer property will be returned. |

#### Returns

``null`` \| `DetailedPeerCertificate` \| `PeerCertificate`

An object representing the peer's certificate.

#### Defined in

src/core/target/types/server/http/router/socket.d.ts:20

___

### getProtocol

▸ **getProtocol**(): ``null`` \| `string`

Returns a string containing the negotiated SSL/TLS protocol version of the current connection. The value 'unknown' will be returned for
connected sockets that have not completed the handshaking process. The value null will be returned for server sockets or disconnected
client sockets. See https://www.openssl.org/docs/man1.0.2/ssl/SSL_get_version.html for more information.

#### Returns

``null`` \| `string`

#### Defined in

src/core/target/types/server/http/router/socket.d.ts:26

___

### renegotiate

▸ **renegotiate**(`options`): `Promise`<`void`\>

Renegotiates a connection to obtain the peer's certificate. This cannot be used when the protocol version is TLSv1.3.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | The options may contain the following fields: rejectUnauthorized, requestCert (See tls.createServer() for details). |
| `options.rejectUnauthorized?` | `boolean` | - |
| `options.requestCert?` | `boolean` | - |

#### Returns

`Promise`<`void`\>

A Promise that will be resolved if renegotiation succeeded, or will be rejected if renegotiation failed.

#### Defined in

src/core/target/types/server/http/router/socket.d.ts:32
