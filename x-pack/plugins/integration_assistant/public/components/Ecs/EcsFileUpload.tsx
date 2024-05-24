import { EuiFilePicker, useGeneratedHtmlId } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';

const EcsFileUpload = () => {
  const filePickerId = useGeneratedHtmlId({ prefix: 'filePicker' });
  const addFormSamples = useGlobalStore((state) => state.addFormSamples);

  const onHandleFileChange = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(processFile);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.ndjson')) {
      console.warn(`Skipped file ${file.name}, unsupported file extension.`);
      return;
    }

    const reader = new FileReader();

    reader.onload = handleFileLoad;
    reader.onerror = handleFileError;

    reader.readAsText(file);
  };

  const handleFileLoad = (e: ProgressEvent<FileReader>) => {
    const text = e.target?.result;
    if (typeof text !== 'string') return;

    const validLines = validateAndExtractLines(text);
    if (validLines.length === 0) return;
    addFormSamples(validLines);
  };

  const validateAndExtractLines = (text: string): string[] => {
    const validLines: string[] = [];
    text.split('\n').forEach((line, index) => {
      try {
        if (line.trim()) {
          JSON.parse(line);
          validLines.push(line);
        }
      } catch (error) {
        console.error(`Error parsing line ${index + 1}: ${line}`, error);
      }
    });
    return validLines;
  };

  const handleFileError = (e: ProgressEvent<FileReader>) => {
    console.error('Failed to read file:', e);
  };

  return (
    <EuiFilePicker
      id={filePickerId}
      multiple
      initialPromptText="Select or drag and drop multiple log files"
      onChange={onHandleFileChange}
      aria-label="sample-file-upload"
    />
  );
};

export default EcsFileUpload;
