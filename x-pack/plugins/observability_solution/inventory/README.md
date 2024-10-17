# Inventory

Home of the Inventory plugin, which renders the... _inventory_.

# Running e2e (Cypress) tests

How to open cypress dashboard locally:
```
node x-pack/plugins/observability_solution/inventory/scripts/test/e2e.js --open            
```

How to run cypress tests:
```
node x-pack/plugins/observability_solution/inventory/scripts/test/e2e.js
```

How to run cypress tests multiple times:
```
node x-pack/plugins/observability_solution/inventory/scripts/test/e2e.js --server
node x-pack/plugins/observability_solution/inventory/scripts/test/e2e.js --runner --times=X
```
