import { JsonOutputParser } from '@langchain/core/output_parsers';
import { CATEGORIZATION_REVIEW_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { CategorizationState } from '../../types';
import { combineProcessors } from '../../util/pipeline';
import { ECS_EVENT_TYPES_PER_CATEGORY } from './constants';
import { Pipeline } from '../../../common/types';

export async function handleReview(state: CategorizationState) {
  const categorizationReviewPrompt = CATEGORIZATION_REVIEW_PROMPT;
  const model = getModel();
  console.log('testing cat review');

  const outputParser = new JsonOutputParser();
  const categorizationReview = categorizationReviewPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await categorizationReview.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
    ex_answer: state?.exAnswer,
    package_name: state?.packageName,
    compatibility_matrix: JSON.stringify(ECS_EVENT_TYPES_PER_CATEGORY, null, 2),
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: true,
    lastExecutedChain: 'review',
  };
}
