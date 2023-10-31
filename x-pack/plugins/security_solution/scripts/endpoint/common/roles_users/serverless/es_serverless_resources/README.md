# Security Solution Serverless Resources

Directory contains ES serverless resources that can be used to override the defaults that are loaded when ES is started in serverless mode. For more information on how these are used [packages/kbn-es/src/serverless_resources/README.md](https://github.com/elastic/kibana/blob/main/packages/kbn-es/src/serverless_resources/README.md)

> **ℹ️ NOTE**
> 
> The files referenced via `--resources` argument will be bound and mounted to the ES docker containers that are running ES. This means that any changes to the files done on the host machine will be automatically (after a delay - 5s by default) picked up by Elasticsearch and applied to the ES docker nodes.

## Usage

Example executed from the root directory of Kibana: 

```shell
yarn es serverless \
--clean \
--kill \
-E xpack.security.authc.api_key.enabled=true \
-E http.host=0.0.0.0 \
--resources=./x-pack/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources/roles.yml \
--resources=./x-pack/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources/users \
--resources=./x-pack/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources/users_roles
```

> **💡️TIP**
> 
> If needing to make custom changes to any of the ES resources for personal dev. purposes, copy the files located in this folder to your own local directly, make changes there and then use those file paths when starting ES



## Files

### `roles.yml`

The list of Roles that are loaded into security serverless projects. The values in this file should match those in the [project controller](https://github.com/elastic/project-controller/blob/main/internal/project/security/config/roles.yml) and should remain in sync.

### `users`

List of users that are loaded into ES for serverless. This file currently includes a user for each of the Security Project roles (same name as the role). All users in this file have their password set to `changeme`

Format: `user:encrypted_password`

### `users_roles`

A map of role names (should match those define in the `roles.yml`) to list of users (values found in the `users` file). All Security serverless roles are listed in this file along with one user by the same name.

Format: `role_name:username,username,username`

