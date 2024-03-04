# Visual Studio Code

When using [Visual Studio Code](https://code.visualstudio.com/) with APM it's best to set up a [multi-root workspace](https://code.visualstudio.com/docs/editor/multi-root-workspaces) and add the `x-pack/plugins/apm` directory, the `x-pack` directory, and the root of the Kibana repository to the workspace. This makes it so you can navigate and search within APM and use the wider workspace roots when you need to widen your search.

## Using the Jest extension

The [vscode-jest extension](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) is a good way to run your Jest tests inside the editor.

Some of the benefits of using the extension over just running it in a terminal are:

• It shows the pass/fail of a test inline in the test file
• It shows the error message in the test file if it fails
• You don’t have to have the terminal process running
• It can automatically update your snapshots when they change
• Coverage mapping

The extension doesn't really work well if you're trying to use it on all of Kibana or all of X-Pack, but it works well if you configure it to run only on the files in APM.

If you have a workspace configured as described above you should have:

```json
"jest.disabledWorkspaceFolders": ["kibana", "x-pack"]
```

## Jest debugging

To make the [VSCode debugger](https://vscode.readthedocs.io/en/latest/editor/debugging/) work with Jest (you can set breakpoints in the code and tests and use the VSCode debugger) you'll need the [Node Debug extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.node-debug2) installed and can set up a launch configuration like:

```json
{
  "type": "node",
  "name": "vscode-jest-tests",
  "request": "launch",
  "args": [
    "--runInBand",
    "--config=${workspaceFolder}/jest.config.js"
    ],
  "cwd": "${workspaceFolder}",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen",
  "disableOptimisticBPs": true,
  "program": "${workspaceFolder}/../../../node_modules/jest/bin/jest"
}
```

(you'll want `runtimeVersion` to match what's in the Kibana root .nvmrc. Depending on your setup, you might be able to remove this line.)
