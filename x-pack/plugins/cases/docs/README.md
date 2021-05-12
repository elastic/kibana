# Cases Client API Docs

This directory contains generated docs using `typedoc` for the cases client API that can be called from other server
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
cd x-pack/plugins/cases/docs
npx typedoc --options typedoc.json
```
