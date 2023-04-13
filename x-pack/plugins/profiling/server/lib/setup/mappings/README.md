## Universal Profiling mappings

### Server routes

* Check if ES setup is done

      curl -H "content-type: application/json" -u <user:pass> \
        -XGET "http://localhost:5601/api/profiling/v1/setup/es_resources"

* Apply the ES setup (mappings + Fleet policy)

      curl -H "content-type: application/json" -u <user:pass> -H "kbn-xsrf: reporting" \
        -XPOST "http://localhost:5601/api/profiling/v1/setup/es_resources"

* check data has been ingested

      curl -H "content-type: application/json" -u <user:pass> \
         -XGET "http://localhost:5601/api/profiling/v1/setup/has_data"
    

### Testing in Cloud

Be sure to have configured `EC_API_KEY` env var with an API key for Cloud (ESS).

Build and push a Kibana image with the latest changes.
Choose a unique identifier for the build, then:

```
node scripts/build --docker-images --skip-docker-ubi --skip-docker-ubuntu
docker tag docker.elastic.co/kibana-ci/kibana-cloud:8.7.0-SNAPSHOT docker.elastic.co/observability-ci/kibana:<UNIQUE_IDENTIFIER>
docker push docker.elastic.co/observability-ci/kibana:<UNIQUE_IDENTIFIER>
```

Then, within `apm-server` repo:

```
cd testing/cloud
make
vim docker_image.auto.tfvars
```

Replace the `"kibana"` key in `docker_image_tag_override=` map with your unique identifier tag from previous step.
Now you can run:

```
terraform init
terraform apply -var-file docker_image.auto.tfvars
```

and once completed, you'll see the output with information on how to access the deployment.

When changing code in Kibana, you don't need to tear down the Terraform deployment, simply update the `docker_image.auto.tfvars`
with the new tag and run `terraform apply ...` as above: this will update Kibana.
