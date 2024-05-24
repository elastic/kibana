import { JsonOutputParser } from '@langchain/core/output_parsers';
import { CATEGORIZATION_VALIDATION_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { CategorizationState } from '../../types';
import { combineProcessors } from '../../util/pipeline';
import { ECS_EVENT_TYPES_PER_CATEGORY } from './constants';
import { Pipeline } from '../../../common/types';

export async function handleInvalidCategorization(state: CategorizationState) {
  const categorizationInvalidPrompt = CATEGORIZATION_VALIDATION_PROMPT;
  const model = getModel();
  console.log('testing cat invalid');

  const outputParser = new JsonOutputParser();
  const categorizationInvalidGraph = categorizationInvalidPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await categorizationInvalidGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    invalid_categorization: JSON.stringify(state.invalidCategorization, null, 2),
    ex_answer: state.exAnswer,
    compatible_types: JSON.stringify(ECS_EVENT_TYPES_PER_CATEGORY, null, 2),
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'invalidCategorization',
  };
}
