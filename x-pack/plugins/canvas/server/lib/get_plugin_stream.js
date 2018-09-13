import fs from 'fs';
import ss from 'stream-stream';
import { getPluginPaths } from './get_plugin_paths';

export const getPluginStream = type => {
  const stream = ss();

  getPluginPaths(type).then(files => {
    files.forEach(file => {
      stream.write(fs.createReadStream(file));
    });
    stream.end();
  });

  return stream;
};
