### Generating key material

Key material can be generated in the following manner:

#### Generate a key pair with openssl

```shell
openssl genrsa 2048 > jwks_private.pem
openssl rsa -in jwks_private.pem -pubout > jwks_public.pem
```

#### Create a JWKS from the public key

For example, with [pem-jwk](https://github.com/dannycoates/pem-jwk)

```shell
pem-jwk jwks_public.pem > jwks.json
```

If the tool used doesn't have an option to wrap the key in a key set, you can manually do that by
placing the json key within a
```javascript
{
  "keys": []  
}
```

section