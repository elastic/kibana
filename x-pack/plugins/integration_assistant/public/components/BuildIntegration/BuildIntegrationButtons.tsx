import { EuiFlexGroup } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';

import { buildIntegration, installIntegration } from '@api/services/integrationBuilderService';
import RoutePaths from '@Constants/routePaths';
import ActionButton from '@Components/Buttons/ActionButton';
import GoBackButton from '@Components/Buttons/GoBackButton';

const BuildIntegrationButtons = () => {
  const integrationBuilderZipFile = useGlobalStore((state) => state.integrationBuilderZipFile);
  const packageName = useGlobalStore((state) => state.packageName);
  const packageTitle = useGlobalStore((state) => state.packageTitle);
  const packageVersion = useGlobalStore((state) => state.packageVersion);
  const dataStreamName = useGlobalStore((state) => state.dataStreamName);
  const inputTypes = useGlobalStore((state) => state.inputTypes);
  const formSamples = useGlobalStore((state) => state.formSamples);
  const ingestPipeline = useGlobalStore((state) => state.ingestPipeline);
  const docs = useGlobalStore((state) => state.docs);

  const setIntegrationBuilderZipFile = useGlobalStore((state) => state.setIntegrationBuilderZipFile);
  const setIntegrationBuilderStepsState = useGlobalStore((state) => state.setIntegrationBuilderStepsState);

  const onBuildClick = async () => {
    const req = {
      packageName,
      packageTitle,
      packageVersion,
      dataStreamName,
      inputTypes,
      formSamples,
      ingestPipeline,
      docs,
    };
    const response = await buildIntegration(req);
    if (response) {
      setIntegrationBuilderZipFile(response);
      console.log('Integration built successfully', response.name);
      setIntegrationBuilderStepsState('integrationBuilderStep5', 'complete');
    }
  };

  const onDownloadClick = () => {
    if (integrationBuilderZipFile) {
      const url = window.URL.createObjectURL(integrationBuilderZipFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = integrationBuilderZipFile.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  const onInstallClick = async () => {
    if (integrationBuilderZipFile) {
      installIntegration(integrationBuilderZipFile);
    }
    console.log('installed');
  };

  return (
    <EuiFlexGroup>
      <ActionButton text="Build Integration" onActionClick={onBuildClick} />
      <ActionButton text="Download Integration" onActionClick={onDownloadClick} />
      <ActionButton text="Install To Kibana (Not Implemented)" onActionClick={onInstallClick} isDisabled={true}/>
      <GoBackButton path={RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH} />
    </EuiFlexGroup>
  );
};

export default BuildIntegrationButtons;
