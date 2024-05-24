import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RELATED_ERROR_PROMPT } from './prompts';
import { getModel } from '../../providers/bedrock';
import { RelatedState } from '../../types';
import { combineProcessors } from '../../util/pipeline';
import { Pipeline } from '../../../common/types';

export async function handleErrors(state: RelatedState) {
  const relatedErrorPrompt = RELATED_ERROR_PROMPT;
  const model = getModel();
  console.log('testing related error');

  const outputParser = new JsonOutputParser();
  const relatedErrorGraph = relatedErrorPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedErrorGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    ex_answer: state.exAnswer,
    errors: JSON.stringify(state.errors, null, 2),
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'error',
  };
}
