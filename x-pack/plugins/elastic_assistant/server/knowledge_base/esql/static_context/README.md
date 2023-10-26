### Description

Files in this directory are loaded via the following in esql_loader.ts:

```ts
const staticContextLoader = new DirectoryLoader(
    resolve(__dirname, '../../../knowledge_base/esql/static_context'),
    {
        '.asciidoc': (path) => new TextLoader(path),
    },
    true
);
```