### Optimizing TypeScript for Canvas Development

> Hard forked from:
> `x-pack/plugins/apm/scripts/optimize-tsconfig.js`
> and
> `x-pack/plugins/security_solution/scripts/optimize_tsconfig.js`

Kibana and X-Pack are very large TypeScript projects, and it comes at a cost. Editor responsiveness is not great, and the CLI type check for X-Pack takes about three minutes. To get faster feedback, we create a smaller Canvas TypeScript project that only type checks the Canvas project and the files it uses.

This optimization consists of creating a `tsconfig.json` in Canvas that includes the Kibana/X-Pack typings, and using that configuration to edit the Kibana/X-Pack configurations. The script then configures git to ignore any changes in these files (so changes are not accidentally committed to `master`) and has an undo script as well.

To run the optimization:

`$ node x-pack/plugins/canvas/scripts/optimize_tsconfig`

To undo the optimization:

`$ node x-pack/plugins/canvas/scripts/unoptimize_tsconfig`

