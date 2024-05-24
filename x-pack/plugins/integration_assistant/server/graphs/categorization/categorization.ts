import { JsonOutputParser } from '@langchain/core/output_parsers';
import { getModel } from '../../providers/bedrock';
import { CategorizationState } from '../../types';
import { combineProcessors } from '../../util/pipeline';
import { Pipeline } from '../../../common/types';
import { CATEGORIZATION_MAIN_PROMPT } from './prompts';

export async function handleCategorization(state: CategorizationState) {
  const categorizationMainPrompt = CATEGORIZATION_MAIN_PROMPT;
  const model = getModel();
  console.log('testing cat main');

  const outputParser = new JsonOutputParser();
  const categorizationMainGraph = categorizationMainPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await categorizationMainGraph.invoke({
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
    ex_answer: state?.exAnswer,
    ecs_categories: state?.ecsCategories,
    ecs_types: state?.ecsTypes,
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    lastExecutedChain: 'categorization',
  };
}
