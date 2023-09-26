# OpenAPI (Experimental)

Spec files for Elastic Map Service manifests can be used for online tools like those found at https://openapi.tools/. 

* **EMS Tile Service** as [JSON](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/maps/docs/openapi/ems_tile_service/bundled.json) or [YAML](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/maps/docs/openapi/ems_tile_service/bundled.yaml)
* **EMS File Service** as [JSON](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/maps/docs/openapi/ems_file_service/bundled.json) or [YAML](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/maps/docs/openapi/ems_file_service/bundled.yaml)


A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## Tools

You can use the `Makefile` script with the `validate`, `bundle`, and `clean` targets.

Alternatively, you can run this validate the docs before bundling them with the following command in the `x-pack/plugins/maps/docs/openapi/` folder:

  ```bash
for e in ems_file_service ems_tile_service; do
  npx swagger-cli validate "${e}/entrypoint.yaml"; 
done
  ```

Then you can generate the `bundled` files by running the following commands:

  ```bash
for e in ems_file_service ems_tile_service; do
  for f in yaml json; do
    npx @redocly/cli bundle \
      --output "${e}/bundled.${f}" \
      --ext "${f}" "${e}/entrypoint.yaml"
  done
done
  ```

You can run additional linting with the following command:

```bash
for e in ems_file_service ems_tile_service; do
  npx @redocly/cli lint "${e}/bundled.json"; 
done
```
