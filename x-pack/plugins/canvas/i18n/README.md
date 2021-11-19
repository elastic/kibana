# Canvas and Internationalization (i18n)

Creating i18n strings in Kibana requires use of the [`@kbn/i18n`](https://github.com/elastic/kibana/blob/main/packages/kbn-i18n/GUIDELINE.md) library. The following outlines the strategy for localizing strings in Canvas

## Why i18n Dictionaries

In Canvas, we prefer to use "dictionaries" of i18n strings over including translation inline. There are a number of reasons for this.

### API Signature is Lengthy

A call to localize a string can look something like this:

```ts
i18n.translate('xpack.canvas.functions.alterColumn.args.columnHelpText', {
  defaultMessage: 'The name of the column to alter.',
}),
```

But it can also look something like this:

```ts
i18n.translate('xpack.canvas.functions.alterColumnHelpText', {
  defaultMessage:
    'Converts between core types, including {list}, and {end}, and rename columns. ' +
    'See also {mapColumnFn} and {staticColumnFn}.',
  values: {
    list: Object.values(DATATABLE_COLUMN_TYPES)
      .slice(0, -1)
      .map(type => `\`${type}\``)
      .join(', '),
    end: Object.values(DATATABLE_COLUMN_TYPES).slice(-1)[0],
    mapColumnFn: '`mapColumn`',
    staticColumnFn: '`staticColumn`',
  },
});
```

In either case, including all of this code inline, where the string is ultimately utilized, makes the code look very uneven, or even complicated. By externalizing the construction of localized strings, we can reduce both of these examples:

```ts
import { FunctionStrings } from './some/i18n/dictionary';
const { AlterColumn: strings } = FunctionStrings;

const help = strings.getColumnHelpText();
const moreHelp = strings.getAlterColumnHelpText();
```

### Reducing Duplication, Auditing

By externalizing our strings into these functional dictionaries, we also make identifying duplicate strings easier... thus removing workload from translation teams. We can also deprecate functions. And Since they're written in Typescript, finding usage is easier, so we can easily remove them if a string is no longer used.

It will also make writing more advanced auditing tools easier.

## Creating i18n Dictionaries

There are some Best Practices™️ to follow when localizing Canvas strings:

- Create dictionaries in `/canvas/i18n`.
  - Organize first by the top-level subject or directory, (e.g. `functions`, `renderers`, `components`, etc).
- Don't create too many files. Prefer to eventually split up a dictionary rather than start with many small ones.
  - Let's avoid ten files with two strings apiece, for example.
- Create functions that produce a `string`, rather than properties of `string`s.
  - Prefer `getSomeString({...values}) => i18n.translate(...);`.
  - Avoid `someString: i18n.translate(...);`.
  - Standardizes the practice, also allows for passing dynamic values to the localized string in the future.
  - Exception to this is the dictionary for Canvas `Function`s, which use a more complex dictionary, influenced by `data/interpreter`.

## Constants

In some cases, there are proper nouns or other words that should not be translated, (e.g. 'Canvas', 'JavaScript', 'momentJS', etc). We've created `/canvas/i18n/constants.ts` to collect these words. Use and add to these constants as necessary.
