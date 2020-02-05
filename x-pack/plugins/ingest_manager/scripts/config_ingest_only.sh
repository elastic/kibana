#!/usr/bin/env bash
printf "\n\nShould log \'[ingestManager][plugins] Setting up plugin\'\n\n"
yarn start --no-base-path --xpack.ingestManager.enabled=true
