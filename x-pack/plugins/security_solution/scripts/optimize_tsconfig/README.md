Hard forked from here:
x-pack/plugins/apm/scripts/optimize-tsconfig.js


#### Optimizing TypeScript 

Kibana and X-Pack are very large TypeScript projects, and it comes at a cost. Editor responsiveness is not great, and the CLI type check for X-Pack takes about a minute. To get faster feedback, we create a smaller SIEM TypeScript project that only type checks the SIEM project and the files it uses. This optimization consists of creating a `tsconfig.json` in SIEM that includes the Kibana/X-Pack typings, and editing the Kibana/X-Pack configurations to not include any files, or removing the configurations altogether. The script configures git to ignore any changes in these files, and has an undo script as well.

To run the optimization:

`$ node x-pack/plugins/security_solution/scripts/optimize_tsconfig`

To undo the optimization:

`$ node x-pack/plugins/security_solution/scripts/unoptimize_tsconfig`

