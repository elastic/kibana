# @kbn/genai-cli

Repository of GenAI scripts, both for practical and educational purposes.

Usage:

```ts
import { runRecipe } from '../utils/run_recipe';

runRecipe(async ({ inferenceClient, kibanaClient, log, signal }) => {
  const output = await inferenceClient.output({});

  log.info(output);
});
```
