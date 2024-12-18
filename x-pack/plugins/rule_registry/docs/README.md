# Alerts as data Client API Docs

This directory contains generated docs using `typedoc` for the alerts as data client (alerts client) API that can be called from other server
plugins. This README will describe how to generate a new version of these markdown docs in the event that new methods
or parameters are added.

## TypeDoc Info

See more info at: <https://typedoc.org/>
and: <https://www.npmjs.com/package/typedoc-plugin-markdown> for the markdown plugin

## Install dependencies

```bash
yarn global add typedoc typedoc-plugin-markdown
```

## Generate the docs

```bash
cd x-pack/plugins/rule_registry/docs
npx typedoc --gitRemote upstream --options alerts_client_typedoc.json
```

After running the above commands the files in the `server` directory will be updated to match the new tsdocs.
If additional markdown directory should be created we can create a new typedoc configuration file and adjust the `out`
directory accordingly.

## Troubleshooting

This will use the global `tsc` so ensure typescript is installed globally and one of typescript version `3.9, 4.0, 4.1, 4.2`.

```
$ tsc --version
Version 4.2.4
```

If you run into tsc errors that seem unrelated to the cases plugin try executing these commands before running `typedoc`

```bash
cd <kibana root dir>
npx yarn kbn bootstrap
node scripts/type_check.js --clean-cache
```
