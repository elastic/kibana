import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ECS_MISSING_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { EcsMappingState } from '../../types';

export async function handleMissingKeys(state: EcsMappingState) {
  const ecsMissingPrompt = ECS_MISSING_PROMPT;
  const model = getModel();
  console.log('testing ecs missing');

  const outputParser = new JsonOutputParser();
  const ecsMissingGraph = ecsMissingPrompt.pipe(model).pipe(outputParser);

  const currentMapping = await ecsMissingGraph.invoke({
    ecs: state.ecs,
    current_mapping: state.currentMapping,
    ex_answer: state.exAnswer,
    formatted_samples: state.formattedSamples,
    missing_keys: state?.missingKeys,
  });

  return { currentMapping, lastExecutedChain: 'missingKeys' };
}
