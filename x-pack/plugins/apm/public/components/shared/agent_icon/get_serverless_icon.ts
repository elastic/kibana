
import defaultIcon from '../span_icon/icons/default.svg';
import lambdaIcon from './icons/lambda.svg';
import azureFunctionsIcon from './icons/functions.svg';

const serverlessIcons: { [key: string]: string } = {
  'aws.lambda': lambdaIcon,
  'azure.functions': azureFunctionsIcon,
};

const darkServerlessIcons: { [key: string]: string } = {
  ...serverlessIcons,
};

export function getServerlessIcon(
  serverlessType: string | undefined,
  isDarkMode: boolean
) {
  if (!serverlessType) {
    return defaultIcon;
  }
  return (isDarkMode ? darkServerlessIcons[serverlessType] : serverlessIcons[serverlessType]) ?? defaultIcon;
}