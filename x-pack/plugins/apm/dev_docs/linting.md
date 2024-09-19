## Linting

_Note: Run the following commands from the root of Kibana._

### Typescript

```
node scripts/type_check.js --project x-pack/plugins/apm/tsconfig.json
```

### Prettier

```
yarn prettier  "./x-pack/plugins/apm/**/*.{tsx,ts,js}" --write
```

### ESLint

```
node scripts/eslint.js x-pack/legacy/plugins/apm
```
diff --git a/x-pack/plugins/apm/dev_docs/feature_flags.md b/x-pack/plugins/apm/dev_docs/feature_flags.md
