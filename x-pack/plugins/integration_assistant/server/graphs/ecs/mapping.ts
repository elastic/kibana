import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ECS_MAIN_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { EcsMappingState } from '../../types';

export async function handleEcsMapping(state: EcsMappingState) {
  const ecsMainPrompt = ECS_MAIN_PROMPT;
  const model = getModel();
  console.log('testing ecs mapping');

  const outputParser = new JsonOutputParser();
  const ecsMainGraph = ecsMainPrompt.pipe(model).pipe(outputParser);

  const currentMapping = await ecsMainGraph.invoke({
    ecs: state.ecs,
    formatted_samples: state.formattedSamples,
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
    ex_answer: state.exAnswer,
  });

  return { currentMapping, lastExecutedChain: 'ecsMapping' };
}
