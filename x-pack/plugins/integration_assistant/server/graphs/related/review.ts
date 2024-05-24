import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RELATED_REVIEW_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { RelatedState } from '../../types';
import { combineProcessors } from '../../util/pipeline';
import { Pipeline } from '../../../common/types';

export async function handleReview(state: RelatedState) {
  const relatedReviewPrompt = RELATED_REVIEW_PROMPT;
  const model = getModel();
  console.log('testing related review');

  const outputParser = new JsonOutputParser();
  const relatedReviewGraph = relatedReviewPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedReviewGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    ex_answer: state.exAnswer,
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: true,
    lastExecutedChain: 'review',
  };
}
