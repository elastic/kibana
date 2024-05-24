import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RELATED_MAIN_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { RelatedState } from '../../types';
import { combineProcessors } from '../../util/pipeline';
import { Pipeline } from '../../../common/types';

export async function handleRelated(state: RelatedState) {
  const relatedMainPrompt = RELATED_MAIN_PROMPT;
  const model = getModel();
  console.log('testing related main');

  const outputParser = new JsonOutputParser();
  const relatedMainGraph = relatedMainPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedMainGraph.invoke({
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
    ex_answer: state.exAnswer,
    ecs: state.ecs,
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'main',
  };
}
