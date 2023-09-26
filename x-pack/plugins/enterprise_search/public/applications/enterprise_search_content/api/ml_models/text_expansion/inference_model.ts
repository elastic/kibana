import { MlPluginStart } from '@kbn/ml-plugin/public';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';

class InferenceModel {
  public taskType: string;
  public friendlyTaskType: string;
  public modelId: string;

  constructor() {
    this.taskType = SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION;
    this.friendlyTaskType = 'ELSER';
    this.modelId = '';
  }

  public setModelId(modelId: string): void {
    this.modelId = modelId;
  }
}

export const elserInferenceModel = new InferenceModel();

export const configureElserInferenceModel = async (elasticModels: MlPluginStart['elasticModels']) => {
  const elserModel = await elasticModels!.getELSER({version :2});
  elserInferenceModel.setModelId(elserModel.name);
};
