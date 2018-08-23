# Documentation for APM in x-pack-kibana

_Note: Be sure to run the following commands from inside the `x-pack` directory._

### Format with Prettier
```
npx prettier "./plugins/apm/**/*.js" --write
```

### Run tests
```
node scripts/jest.js plugins/apm --watch
```

### Update snapshots
```
node scripts/jest.js plugins/apm --updateSnapshot
```

### Run ESLint (run from kibana root)
```
./node_modules/.bin/eslint ./x-pack/plugins/apm
```

### Ensure everything from master has been backported to 6.x
```
git fetch origin && git checkout 6.x && git diff origin/6.x..origin/master ./plugins/apm | git apply
```
