.DEFAULT_GOAL=help

.PHONY: help
help:  ## Show this help message
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: clean
clean: ## remove generated spec files
	find . -name "bundled.*" -delete

.PHONY: validate
validate: ## Validate the specs
	@npx swagger-cli validate "ems_file_service/entrypoint.yaml"
	@npx swagger-cli validate "ems_tile_service/entrypoint.yaml"

.PHONY: dev-validate
dev-validate: ## Listen for changes on specs and validate
	ls ems_file_service/entrypoint.yaml  ems_tile_service/entrypoint.yaml \
  | entr -c make validate

.PHONY: bundle
bundle:
	for e in ems_file_service ems_tile_service; do \
    for f in yaml json; do \
      npx @redocly/cli bundle \
        --output "$${e}/bundled.$${f}" \
        --ext "$${f}" "$${e}/entrypoint.yaml";\
    done; \
  done;
	$(MAKE) lint

.PHONY: lint
lint: ## lint bundled.json
	@npx @redocly/cli lint ems_file_service/bundled.json
	@npx @redocly/cli lint ems_tile_service/bundled.json
