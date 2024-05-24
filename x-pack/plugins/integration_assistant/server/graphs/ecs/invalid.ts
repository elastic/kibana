import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ECS_INVALID_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { EcsMappingState } from '../../types';

export async function handleInvalidEcs(state: EcsMappingState) {
  const ecsInvalidEcsPrompt = ECS_INVALID_PROMPT;
  const model = getModel();
  console.log('testing ecs invalid');

  const outputParser = new JsonOutputParser();
  const ecsInvalidEcsGraph = ecsInvalidEcsPrompt.pipe(model).pipe(outputParser);

  const currentMapping = await ecsInvalidEcsGraph.invoke({
    ecs: state.ecs,
    current_mapping: JSON.stringify(state.currentMapping, null, 2),
    ex_answer: state.exAnswer,
    formatted_samples: state.formattedSamples,
    invalid_ecs_fields: state.invalidEcsFields,
  });

  return { currentMapping, lastExecutedChain: 'invalidEcs' };
}
