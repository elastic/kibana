.DEFAULT_GOAL := help

.PHONY: validate
validate: ## validate tree
	@npx swagger-cli validate entrypoint.yaml

.PHONY: bundle
bundle: validate ## generate bundled.yaml and bundled.json
	@npx @redocly/cli bundle entrypoint.yaml --output bundled.yaml --ext yaml
	@npx @redocly/cli bundle entrypoint.yaml --output bundled.json --ext json
	@$(MAKE) lint

.PHONY: lint
lint: ## lint bundled.json
	@npx @redocly/cli lint bundled.json

.PHONY: help
help: ## you're looking at it
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m\t%s\n", $$1, $$2 }' $(MAKEFILE_LIST) | column -s$$'\t' -t

