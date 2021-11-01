# Linting

_Note: Run the commands from the root of Kibana._

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
node scripts/eslint.js x-pack/plugins/apm
```

## Install pre-commit hook (optional)
In case you want to run a couple of checks like linting or check the file casing of the files to commit, we provide a way to install a pre-commit hook. To configure it you just need to run the following:

`node scripts/register_git_hook`

After the script completes the pre-commit hook will be created within the file .git/hooks/pre-commit. If you choose to not install it, don’t worry, we still run a quick CI check to provide feedback earliest as we can about the same checks.

More information about linting can be found in the [Kibana Guide](https://www.elastic.co/guide/en/kibana/current/kibana-linting.html).