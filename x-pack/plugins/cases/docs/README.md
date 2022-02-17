# Cases Client API Docs

This directory contains generated docs using `typedoc` for the cases client API that can be called from other server
plugins. This README will describe how to generate a new version of these markdown docs in the event that new methods
or parameters are added.

## TypeDoc Info

See more info at: <https://typedoc.org/>
markdown plugin: <https://www.npmjs.com/package/typedoc-plugin-markdown>
missing exports plugin: <https://github.com/Gerrit0/typedoc-plugin-missing-exports>

## Install dependencies

Ensure that your global typescript version is the same as kibana's

You can run `npx tsc --version` to find the global compiler version and then check the version under `node_modules/typescript/lib`.

```bash
yarn global add typedoc typedoc-plugin-markdown typedoc-plugin-missing-exports
```

## Generate the docs

```bash
cd x-pack/plugins/cases/docs
npx typedoc --options cases_client_typedoc.json
```

After running the above commands the files in the `server` directory will be updated to match the new tsdocs.
If additional markdown directory should be created we can create a new typedoc configuration file and adjust the `out`
directory accordingly.

## Troubleshooting

If you run into tsc errors that seem unrelated to the cases plugin try executing these commands before running `typedoc`

```bash
cd <kibana root dir>
npx yarn kbn bootstrap
node scripts/build_ts_refs.js --clean --no-cache
```
